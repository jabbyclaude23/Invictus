import { NavLink, Outlet, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Dumbbell, Utensils, LineChart, MessageSquare, LayoutDashboard, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import UserMenu from "../components/UserMenu";

const tabs = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/workout", icon: Dumbbell, label: "Workout" },
  { to: "/meals", icon: Utensils, label: "Meals" },
  { to: "/trading", icon: LineChart, label: "Trading" },
  { to: "/coach", icon: MessageSquare, label: "Coach" },
];
function Brand() {
  return <div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d4c17a]/30 bg-[#d4c17a]/10 text-sm font-semibold text-[#d4c17a]">IV</span><div><span className="block text-sm font-semibold tracking-[0.22em] text-[#f4f6f8]">INVICTUS</span><span className="hidden text-[10px] tracking-[0.13em] text-[#7f8a99] lg:block">PERSONAL PERFORMANCE</span></div></div>;
}
export default function MainLayout() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const current = tabs.find(tab => tab.to === location.pathname) || tabs[0];
  const date = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  return <MotionConfig reducedMotion="user"><div className="app-shell min-h-[100dvh] bg-[#0d1014] text-[#f4f6f8]">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#d4c17a] focus:px-4 focus:py-3 focus:text-[#0d1014]">Skip to main content</a>
    <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-white/[0.07] bg-[#101419] px-5 py-7 lg:flex">
      <NavLink to="/" aria-label="Invictus dashboard" className="mb-12"><Brand /></NavLink>
      <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#707d8d]">Workspace</p>
      <nav aria-label="Main navigation" className="space-y-2">{tabs.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${isActive ? "bg-[#d4c17a]/10 text-[#d4c17a]" : "text-[#99a5b5] hover:bg-white/[0.04] hover:text-[#f4f6f8]"}`}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></NavLink>)}</nav>
      <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"><span className="text-[10px] font-medium uppercase tracking-[0.17em] text-[#d4c17a]">The daily practice</span><p className="mt-3 text-sm leading-relaxed text-[#b2bbc7]">Small actions.<br />Lasting progress.</p><NavLink to="/coach" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#d4c17a]">Talk to your coach <ArrowUpRight size={14} /></NavLink></div>
      <p className="mt-6 px-1 text-[10px] tracking-wider text-[#657181]">BUILT FOR YOUR NEXT LEVEL</p>
    </aside>
    <div className="min-w-0 lg:ml-[232px]">
      <header className="app-topbar sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b border-white/[0.07] bg-[#0d1014]/95 px-5 backdrop-blur-xl sm:px-8 lg:h-20 lg:px-10">
        <div className="lg:hidden"><Brand /></div><div className="hidden items-center gap-3 text-sm lg:flex"><span className="text-[#748192]">Workspace</span><span className="text-[#485260]">/</span><span className="text-[#d9dfe7]">{current.label}</span></div>
        <div className="flex items-center gap-5"><span className="hidden text-xs text-[#8491a2] sm:block">{date}</span>{user && <UserMenu user={user} />}</div>
      </header>
      <main id="main-content" tabIndex={-1} className="app-content min-w-0 pb-[calc(76px+env(safe-area-inset-bottom))] outline-none lg:pb-0"><Outlet /></main>
    </div>
    <nav aria-label="Mobile navigation" className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.08] bg-[#101419]/95 px-2 pt-2 backdrop-blur-xl lg:hidden" style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))", minHeight: "calc(76px + env(safe-area-inset-bottom))" }}>
      {tabs.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors ${isActive ? "bg-[#d4c17a]/[0.07] text-[#d4c17a]" : "text-[#8491a2] hover:text-[#f4f6f8]"}`}><Icon size={20} strokeWidth={1.7} /><span>{label}</span></NavLink>)}
    </nav>
  </div></MotionConfig>;
}
