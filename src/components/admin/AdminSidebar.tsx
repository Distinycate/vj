'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, Archive, BookOpen, CalendarDays, Gift, Globe2, GraduationCap, House, LayoutDashboard, LogOut, Menu, Settings, Target, Trophy, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AdminSection = 'school-overview' | 'overview' | 'students' | 'weak-words' | 'risks' | 'onet' | 'pre-post' | 'teams' | 'events' | 'term-archive' | 'settings';
type MenuItem = { label: string; icon: LucideIcon } & ({ section: AdminSection; href?: never } | { section?: never; href: string });

const groups: { label: string; items: MenuItem[] }[] = [
  { label: 'นักเรียนและห้องเรียน', items: [
    { section: 'school-overview', label: 'ภาพรวมโรงเรียน', icon: LayoutDashboard },
    { section: 'students', label: 'รายชื่อนักเรียน', icon: Users },
    { section: 'overview', label: 'สถิติห้องเรียน', icon: Activity },
    { section: 'weak-words', label: 'คำศัพท์ที่ตอบผิด', icon: BookOpen },
    { section: 'risks', label: 'นักเรียนที่ต้องติดตาม', icon: AlertTriangle },
  ] },
  { label: 'การสอนและวัดผล', items: [
    { href: '/admin/teach', label: 'โหมดสอน Grammar และ O-NET', icon: GraduationCap },
    { href: '/admin/worksheets', label: 'แบบฝึกหัดคำศัพท์', icon: BookOpen },
    { section: 'onet', label: 'วิเคราะห์ผล O-NET', icon: Target },
    { section: 'pre-post', label: 'คะแนนก่อน–หลังเรียน', icon: Activity },
    { section: 'term-archive', label: 'ผลย้อนหลังและ ปพ.5', icon: Archive },
  ] },
  { label: 'กิจกรรมและการ์ด', items: [
    { section: 'events', label: 'กิจกรรมและแก้ 0/ร', icon: CalendarDays },
    { section: 'teams', label: 'Team Battle', icon: Trophy },
    { href: '/admin/cards', label: 'จัดการการ์ด', icon: Gift },
  ] },
  { label: 'จัดการระบบ', items: [
    { href: '/admin/external-network', label: 'โรงเรียนเครือข่าย', icon: Globe2 },
    { section: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ] },
];

export function adminSectionLabel(section: AdminSection) {
  return groups.flatMap(group => group.items).find(item => item.section === section)?.label ?? '';
}

export default function AdminSidebar({ current, onSelect, onLogout }: {
  current: AdminSection;
  onSelect: (section: AdminSection) => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const row = 'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-indigo-300';
  const inactive = 'text-slate-300 hover:bg-slate-800 hover:text-white';

  return (
    <aside className="border-b border-slate-800 bg-slate-900 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r" aria-label="พื้นที่นำทาง">
      <button type="button" aria-controls="admin-navigation" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-bold text-white lg:hidden">
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        เมนูครูและแอดมิน
      </button>
      <nav id="admin-navigation" aria-label="เมนูครูและแอดมิน" className={open ? 'block px-3 pb-4 lg:p-4' : 'hidden px-3 pb-4 lg:block lg:p-4'}>
        <div className="mb-4 hidden border-b border-slate-800 px-2 pb-4 lg:block">
          <p className="font-black text-white">Vocab Journey</p>
          <p className="mt-1 text-sm text-slate-400">พื้นที่ครูและแอดมิน</p>
        </div>
        {groups.map(group => (
          <div key={group.label} className="mb-4">
            <p className="px-3 py-1 text-xs font-bold text-slate-400">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ section, href, label, icon: Icon }) => (
                <li key={section ?? href}>
                  {section ? <button type="button" aria-current={current === section ? 'page' : undefined}
                    onClick={() => { setOpen(false); onSelect(section); }}
                    className={row + (current === section ? ' bg-indigo-500/20 font-bold text-indigo-100' : ' ' + inactive)}>
                    <Icon size={17} className="shrink-0" aria-hidden="true" />{label}
                  </button> : <Link href={href!} prefetch={false} className={row + ' ' + inactive}>
                    <Icon size={17} className="shrink-0" aria-hidden="true" />{label}
                  </Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="border-t border-slate-800 pt-2">
          <Link href="/" prefetch={false} className={row + ' ' + inactive}><House size={17} aria-hidden="true" />กลับหน้าเข้าใช้งาน</Link>
          <button type="button" onClick={onLogout} className={row + ' ' + inactive}><LogOut size={17} aria-hidden="true" />ออกจากระบบ</button>
        </div>
      </nav>
    </aside>
  );
}
