export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000"></div>
      
      <div className="z-10 text-center max-w-2xl bg-white/10 backdrop-blur-lg p-10 rounded-3xl border border-white/20 shadow-2xl">
        <h1 className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-emerald-400 to-blue-500 text-transparent bg-clip-text">
          Vocab Journey
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          The ultimate English learning platform is being forged in the cloud. 
        </p>
        
        <div className="flex flex-col gap-4 text-left bg-black/30 p-6 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-2xl">✓</span>
            <span>GitHub Connected</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-2xl">✓</span>
            <span>Supabase Configured</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-2xl">✓</span>
            <span>Vercel Ready</span>
          </div>
        </div>

        <button className="mt-8 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-full font-bold text-lg shadow-lg hover:shadow-emerald-500/30 transition-all">
          ระบบกำลังอัปเกรด...
        </button>
      </div>
    </div>
  );
}
