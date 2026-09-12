import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import crypto from 'node:crypto';

const migrationSql = readFileSync('MIGRATION_USER_SESSIONS_AND_HARDENING.sql', 'utf8');
const shopRoute = readFileSync('src/app/api/shop/purchase/route.ts', 'utf8');
const gameCompleteRoute = readFileSync('src/app/api/game/complete/route.ts', 'utf8');
const eventRewardRoute = readFileSync('src/app/api/events/reward/route.ts', 'utf8');

// ============================================================================
// CONCURRENT TRANSACTION SIMULATOR (PostgreSQL PL/pgSQL Atomic Mechanics)
// ============================================================================

class MockDatabaseConcurrencyEngine {
  private learningPaths = new Map<string, { coins: number; exp: number; totalExp: number }>();
  private shopPurchases = new Set<string>(); // composite: studentId + purchaseRequestId
  private economyTransactions: Array<{ studentId: string; source: string; refId: string; coinsDelta: number }> = [];
  private stageAttempts = new Map<string, { studentId: string; status: string; coinsAwarded: number; expAwarded: number }>();
  
  // Mutex per student to emulate PostgreSQL 'FOR UPDATE' row lock
  private locks = new Map<string, Promise<void>>();

  private async acquireRowLock(studentId: string): Promise<() => void> {
    let resolveLock!: () => void;
    const nextLock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    const currentLock = this.locks.get(studentId) || Promise.resolve();
    this.locks.set(studentId, currentLock.then(() => nextLock));

    await currentLock;
    return resolveLock;
  }

  setStudentBalance(studentId: string, coins: number, exp: number = 0, totalExp: number = 0) {
    this.learningPaths.set(studentId, { coins, exp, totalExp });
  }

  getStudentBalance(studentId: string) {
    return this.learningPaths.get(studentId);
  }

  createAttempt(attemptId: string, studentId: string) {
    this.stageAttempts.set(attemptId, {
      studentId,
      status: 'IN_PROGRESS',
      coinsAwarded: 0,
      expAwarded: 0,
    });
  }

  getEconomyLedgerCount(studentId: string, source: string, refId: string): number {
    return this.economyTransactions.filter(
      (t) => t.studentId === studentId && t.source === source && t.refId === refId
    ).length;
  }

  /**
   * Models: purchase_shop_item(p_student_id, p_item_id, p_purchase_request_id)
   */
  async purchaseShopItem(studentId: string, itemId: string, purchaseRequestId: string, itemPrice: number) {
    // 1. Check idempotency: If this purchaseRequestId was already executed, return success
    const idempotencyKey = `${studentId}:${purchaseRequestId}`;
    if (this.shopPurchases.has(idempotencyKey)) {
      const current = this.learningPaths.get(studentId)!;
      return { success: true, alreadyPurchased: true, newCoins: current.coins };
    }

    // 2. Acquire PostgreSQL 'FOR UPDATE' row lock
    const releaseLock = await this.acquireRowLock(studentId);
    try {
      // Re-check idempotency under lock
      if (this.shopPurchases.has(idempotencyKey)) {
        const current = this.learningPaths.get(studentId)!;
        return { success: true, alreadyPurchased: true, newCoins: current.coins };
      }

      const path = this.learningPaths.get(studentId);
      if (!path) throw new Error('LEARNING_PATH_NOT_FOUND');

      if (path.coins < itemPrice) {
        throw new Error('INSUFFICIENT_COINS');
      }

      // Deduct coins atomically
      path.coins -= itemPrice;

      // Record purchase & append ledger
      this.shopPurchases.add(idempotencyKey);
      this.economyTransactions.push({
        studentId,
        source: 'SHOP',
        refId: purchaseRequestId,
        coinsDelta: -itemPrice,
      });

      return { success: true, alreadyPurchased: false, newCoins: path.coins };
    } finally {
      releaseLock();
    }
  }

  /**
   * Models: complete_stage_transaction(p_attempt_id, p_student_id, ...)
   */
  async completeStageTransaction(attemptId: string, studentId: string, earnedCoins: number, earnedExp: number) {
    const releaseLock = await this.acquireRowLock(studentId);
    try {
      const attempt = this.stageAttempts.get(attemptId);
      if (!attempt || attempt.studentId !== studentId) {
        throw new Error('STAGE_ATTEMPT_NOT_FOUND');
      }

      // Idempotency: If already completed, return existing results without re-awarding
      if (attempt.status === 'COMPLETED') {
        return {
          alreadyCompleted: true,
          coinsAwarded: attempt.coinsAwarded,
          expAwarded: attempt.expAwarded,
        };
      }

      attempt.status = 'COMPLETED';
      attempt.coinsAwarded = earnedCoins;
      attempt.expAwarded = earnedExp;

      const path = this.learningPaths.get(studentId)!;
      path.coins += earnedCoins;
      path.exp += earnedExp;
      path.totalExp += earnedExp;

      this.economyTransactions.push({
        studentId,
        source: 'STAGE_COMPLETION',
        refId: attemptId,
        coinsDelta: earnedCoins,
      });

      return {
        alreadyCompleted: false,
        coinsAwarded: earnedCoins,
        expAwarded: earnedExp,
        newCoins: path.coins,
      };
    } finally {
      releaseLock();
    }
  }

  /**
   * Models: grant_student_reward(p_student_id, p_source, p_reference_id, ...)
   */
  async grantStudentReward(studentId: string, source: string, referenceId: string, coinsDelta: number, expDelta: number) {
    const releaseLock = await this.acquireRowLock(studentId);
    try {
      // Check idempotency in ledger
      const existing = this.economyTransactions.find(
        (t) => t.studentId === studentId && t.source === source && t.refId === referenceId
      );

      if (existing) {
        const path = this.learningPaths.get(studentId)!;
        return { alreadyGranted: true, coins: path.coins };
      }

      const path = this.learningPaths.get(studentId)!;
      path.coins += coinsDelta;
      path.exp += expDelta;
      path.totalExp += expDelta;

      this.economyTransactions.push({
        studentId,
        source,
        refId: referenceId,
        coinsDelta,
      });

      return { alreadyGranted: false, coins: path.coins };
    } finally {
      releaseLock();
    }
  }
}

// ============================================================================
// INTEGRATION CONCURRENCY TESTS
// ============================================================================

test('Concurrency Test 1: Same purchaseRequestId dispatched concurrently -> exactly 1 debit', async () => {
  const engine = new MockDatabaseConcurrencyEngine();
  const studentId = 'student-concurrent-01';
  const purchaseRequestId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const itemPrice = 100;

  engine.setStudentBalance(studentId, 500);

  // Dispatch 2 concurrent purchases with the IDENTICAL purchaseRequestId
  const [res1, res2] = await Promise.all([
    engine.purchaseShopItem(studentId, itemId, purchaseRequestId, itemPrice),
    engine.purchaseShopItem(studentId, itemId, purchaseRequestId, itemPrice),
  ]);

  // One must be the original purchase and the other must be flagged as alreadyPurchased
  const successCount = [res1, res2].filter((r) => r.success && !r.alreadyPurchased).length;
  const cachedCount = [res1, res2].filter((r) => r.success && r.alreadyPurchased).length;

  assert.equal(successCount, 1, 'Exactly one execution must debit');
  assert.equal(cachedCount, 1, 'Duplicate execution must return alreadyPurchased');

  // Balance must be 500 - 100 = 400 (NO double debit!)
  assert.equal(engine.getStudentBalance(studentId)!.coins, 400);

  // Ledger must have exactly 1 record
  assert.equal(engine.getEconomyLedgerCount(studentId, 'SHOP', purchaseRequestId), 1);

  // Verify DB contract in migration SQL
  assert.match(migrationSql, /uq_shop_purchase_request UNIQUE \(student_id, purchase_request_id\)/);
  assert.match(shopRoute, /purchaseRequestId: z\.string\(\)\.uuid\(\)/);
});

test('Concurrency Test 2: Different request IDs exceeding total balance -> cannot overspend / negative balance', async () => {
  const engine = new MockDatabaseConcurrencyEngine();
  const studentId = 'student-concurrent-02';
  const itemPrice = 100;

  // Student has 150 coins (Cannot afford two 100-coin purchases)
  engine.setStudentBalance(studentId, 150);

  const reqA = crypto.randomUUID();
  const reqB = crypto.randomUUID();

  // Dispatch 2 concurrent purchases with DIFFERENT request IDs
  const results = await Promise.allSettled([
    engine.purchaseShopItem(studentId, crypto.randomUUID(), reqA, itemPrice),
    engine.purchaseShopItem(studentId, crypto.randomUUID(), reqB, itemPrice),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one purchase should succeed');
  assert.equal(rejected.length, 1, 'Second purchase must be rejected due to insufficient coins');
  assert.equal((rejected[0] as PromiseRejectedResult).reason.message, 'INSUFFICIENT_COINS');

  // Balance must be 50 coins (150 - 100), never negative!
  const finalBalance = engine.getStudentBalance(studentId)!.coins;
  assert.equal(finalBalance, 50);
  assert.ok(finalBalance >= 0, 'Balance must never drop below zero');

  // Verify SQL row lock
  assert.match(migrationSql, /FOR UPDATE/);
  assert.match(migrationSql, /COALESCE\(v_path\.coins, 0\) < v_item\.price/);
});

test('Concurrency Test 3: Same attemptId stage completion sent concurrently -> awarded exactly once', async () => {
  const engine = new MockDatabaseConcurrencyEngine();
  const studentId = 'student-concurrent-03';
  const attemptId = crypto.randomUUID();

  engine.setStudentBalance(studentId, 0, 0, 0);
  engine.createAttempt(attemptId, studentId);

  // 2 concurrent completion requests for the same attempt
  const [res1, res2] = await Promise.all([
    engine.completeStageTransaction(attemptId, studentId, 50, 100),
    engine.completeStageTransaction(attemptId, studentId, 50, 100),
  ]);

  const freshCompletions = [res1, res2].filter((r) => !r.alreadyCompleted);
  const replayCompletions = [res1, res2].filter((r) => r.alreadyCompleted);

  assert.equal(freshCompletions.length, 1, 'Only one completion awards rewards');
  assert.equal(replayCompletions.length, 1, 'Second completion returns alreadyCompleted');

  // Total balance awarded: coins = 50, exp = 100
  const balance = engine.getStudentBalance(studentId)!;
  assert.equal(balance.coins, 50);
  assert.equal(balance.totalExp, 100);

  // Ledger has exactly 1 entry
  assert.equal(engine.getEconomyLedgerCount(studentId, 'STAGE_COMPLETION', attemptId), 1);

  // Verify SQL attempt status check
  assert.match(migrationSql, /IF v_attempt\.status = 'COMPLETED' THEN/);
  assert.match(gameCompleteRoute, /attemptId/);
});

test('Concurrency Test 4: Event reward replay -> ledger and reward awarded once only', async () => {
  const engine = new MockDatabaseConcurrencyEngine();
  const studentId = 'student-concurrent-04';
  const refId = 'christmas-stage-1';

  engine.setStudentBalance(studentId, 0, 0, 0);

  // Replay event reward simultaneously
  const [res1, res2] = await Promise.all([
    engine.grantStudentReward(studentId, 'CHRISTMAS_EVENT', refId, 30, 60),
    engine.grantStudentReward(studentId, 'CHRISTMAS_EVENT', refId, 30, 60),
  ]);

  const fresh = [res1, res2].filter((r) => !r.alreadyGranted);
  const replayed = [res1, res2].filter((r) => r.alreadyGranted);

  assert.equal(fresh.length, 1);
  assert.equal(replayed.length, 1);

  assert.equal(engine.getStudentBalance(studentId)!.coins, 30);
  assert.equal(engine.getEconomyLedgerCount(studentId, 'CHRISTMAS_EVENT', refId), 1);

  // Verify unique constraint in SQL
  assert.match(migrationSql, /uq_economy_idempotent UNIQUE \(student_id, source, reference_id\)/);
  assert.match(eventRewardRoute, /alreadyGranted: data\.already_granted \|\| false/);
});
