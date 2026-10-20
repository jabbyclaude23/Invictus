import { useRef, useState } from "react";
import { ArrowRight, Dumbbell, Utensils, LineChart, Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signup, login, googleLogin } from "../auth";
import googleLogo from "../assets/google.svg";

export default function Auth() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const navigate = useNavigate();
  async function authenticate(method) {
    if (busy.current) return;
    busy.current = true;
    setPending(method);
    setError("");
    try {
      await (method === "google" ? googleLogin() : (isSignup ? signup : login)(email.trim(), password));
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || "We couldn't connect. Please try again.");
    } finally {
      busy.current = false;
      setPending("");
    }
  }
  return <main className="auth-page min-h-[100dvh] bg-[#0d1014] text-[#f4f6f8] lg:grid lg:grid-cols-2">
    <section className="relative hidden min-h-[100dvh] flex-col justify-between overflow-hidden border-r border-white/[0.07] bg-[#11161c] p-12 xl:p-16 lg:flex">
      <div aria-hidden="true" className="pointer-events-none absolute -right-56 top-1/4 h-[640px] w-[640px] rounded-full border border-[#d4c17a]/10" /><div aria-hidden="true" className="pointer-events-none absolute -right-36 top-[32%] h-[480px] w-[480px] rounded-full border border-[#d4c17a]/10" />
      <div className="relative flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4c17a]/30 bg-[#d4c17a]/10 text-sm font-semibold text-[#d4c17a]">IV</span><span className="text-sm font-semibold tracking-[0.25em]">INVICTUS</span></div>
      <div className="relative max-w-lg py-16"><p className="mb-7 text-xs font-medium uppercase tracking-[0.23em] text-[#d4c17a]">Your personal performance space</p><h1 className="text-5xl font-semibold leading-[1.12] tracking-[-0.04em] xl:text-6xl">Make discipline<br />a daily practice.</h1><p className="mt-7 max-w-sm text-base leading-7 text-[#99a5b5]">Bring your training, nutrition, and trading into focus. One space to build a stronger everyday.</p><div className="mt-12 flex flex-wrap gap-3">{[[Dumbbell, "Train"], [Utensils, "Fuel"], [LineChart, "Execute"]].map(([Icon, label]) => <span key={label} className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-[#b2bbc7]"><Icon size={14} className="text-[#d4c17a]" />{label}</span>)}</div></div>
      <p className="relative text-xs text-[#738091]">Built for intention. Designed for progress.</p>
    </section>
    <section className="flex min-h-[100dvh] flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
      <div className="mx-auto w-full max-w-[390px]">
        <div className="mb-16 flex items-center gap-3 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4c17a]/30 text-sm font-semibold text-[#d4c17a]">IV</span><span className="text-sm font-semibold tracking-[0.25em]">INVICTUS</span></div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#d4c17a]">{isSignup ? "Start your practice" : "A new day. A clear focus."}</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{isSignup ? "Build your next chapter." : "Welcome back."}</h2>
        <p className="mt-3 text-sm leading-6 text-[#99a5b5]">{isSignup ? "Create your account and make room for progress." : "Sign in to your personal performance space."}</p>
        <button type="button" disabled={Boolean(pending)} onClick={() => authenticate("google")} className="mt-9 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.03] text-sm font-medium transition-colors hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-50">{pending === "google" ? <Loader2 size={18} className="animate-spin" /> : <img src={googleLogo} alt="" className="h-[18px] w-[18px]" />}Continue with Google</button>
        <div className="my-7 flex items-center gap-4"><div className="h-px flex-1 bg-white/[0.08]" /><span className="text-[11px] text-[#738091]">or continue with email</span><div className="h-px flex-1 bg-white/[0.08]" /></div>
        <form onSubmit={event => { event.preventDefault(); authenticate("email"); }} className="space-y-5">
          <div><label htmlFor="auth-email" className="mb-2 block text-xs font-medium text-[#c7cfd9]">Email address</label><input id="auth-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" disabled={Boolean(pending)} className="min-h-12 w-full rounded-xl border border-white/10 bg-[#151a20] px-4 text-sm text-[#f4f6f8] outline-none placeholder:text-[#5f6b7b] focus:border-[#d4c17a]/70 focus:ring-2 focus:ring-[#d4c17a]/10 disabled:opacity-50" /></div>
          <div><label htmlFor="auth-password" className="mb-2 block text-xs font-medium text-[#c7cfd9]">Password</label><div className="relative"><input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} required minLength={isSignup ? 6 : undefined} value={password} onChange={event => setPassword(event.target.value)} placeholder={isSignup ? "At least 6 characters" : "Enter your password"} disabled={Boolean(pending)} className="min-h-12 w-full rounded-xl border border-white/10 bg-[#151a20] py-3 pl-4 pr-12 text-sm text-[#f4f6f8] outline-none placeholder:text-[#5f6b7b] focus:border-[#d4c17a]/70 focus:ring-2 focus:ring-[#d4c17a]/10 disabled:opacity-50" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#8491a2] hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm leading-6 text-red-300">{error}</p>}
          <button type="submit" disabled={Boolean(pending)} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#d4c17a] px-4 text-sm font-semibold text-[#161812] transition-colors hover:bg-[#e2d28f] disabled:cursor-wait disabled:opacity-60">{pending === "email" ? <><Loader2 size={17} className="animate-spin" />{isSignup ? "Creating account…" : "Signing in…"}</> : <>{isSignup ? "Create account" : "Sign in"}<ArrowRight size={17} /></>}</button>
        </form>
        <p className="mt-8 text-center text-xs text-[#8491a2]">{isSignup ? "Already have an account?" : "New to Invictus?"} <button type="button" disabled={Boolean(pending)} onClick={() => { setIsSignup(value => !value); setError(""); }} className="ml-1 font-medium text-[#d4c17a] hover:underline disabled:opacity-50">{isSignup ? "Sign in" : "Create an account"}</button></p>
        <p className="mt-14 text-center text-[10px] tracking-[0.12em] text-[#596575]">TRAIN. FUEL. EXECUTE. REPEAT.</p>
      </div>
    </section>
  </main>;
}
