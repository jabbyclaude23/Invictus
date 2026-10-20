import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut, Loader2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const root = useRef(null);
  const toggle = useRef(null);
  const logoutButton = useRef(null);
  const panelId = useId();
  const navigate = useNavigate();
  useEffect(() => {
    if (!open) return;
    logoutButton.current?.focus();
    const onPointer = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const onKey = event => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);
  async function handleLogout() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      setOpen(false);
      navigate("/auth", { replace: true });
    } catch {
      setError("We couldn't sign you out. Please try again.");
    } finally {
      setPending(false);
    }
  }
  const name = user?.displayName || user?.email || "Your account";
  return <div ref={root} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={toggle} type="button" aria-label="Your account" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-2 text-[#b2bbc7] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4c17a]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c17a]/30 bg-[#d4c17a]/10 text-sm font-semibold text-[#d4c17a]">{name.charAt(0).toUpperCase()}</span><ChevronDown size={14} />
    </button>
    {open && <div id={panelId} className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-white/10 bg-[#191f27] p-2 shadow-2xl">
      <div className="mb-2 border-b border-white/[0.07] px-3 py-3"><p className="text-[10px] uppercase tracking-widest text-[#8491a2]">Signed in as</p><p className="mt-1 break-words text-sm text-[#f4f6f8]">{name}</p></div>
      <button ref={logoutButton} type="button" onClick={handleLogout} disabled={pending} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#b2bbc7] hover:bg-white/5 hover:text-white disabled:opacity-50">{pending ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}{pending ? "Signing out…" : "Sign out"}</button>
      {error && <p role="alert" className="px-3 pb-3 text-xs text-red-300">{error}</p>}
    </div>}
  </div>;
}
