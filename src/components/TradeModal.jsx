import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const SETUPS = ["Trend Pullback","Breakout","Reversal","Range","EMA Bounce","Structure Break"];

export default function TradeModal({ onClose, onSave, prefill = null }) {
  const [form, setForm] = useState({
    symbol: "", side: "Long", entry: "", exit: "", size: "", setup: "", notes: "", ...prefill,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pnl = (() => {
    const e = parseFloat(form.entry), x = parseFloat(form.exit), s = parseFloat(form.size);
    if (!e || !x || !s) return null;
    const raw = (form.side === "Long" ? x - e : e - x) * s;
    return Math.round(raw * 100) / 100;
  })();

  const rr = (() => {
    const e = parseFloat(form.entry), x = parseFloat(form.exit);
    if (!e || !x) return null;
    return Math.abs(((x - e) / e) * 100).toFixed(2);
  })();

  const handleSave = async () => {
    if (!form.symbol || !form.entry) return;
    setSaving(true);
    await onSave({ ...form, pnl: pnl ?? 0, entry: parseFloat(form.entry), exit: parseFloat(form.exit) || 0, size: parseFloat(form.size) || 0 });
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-[#111] border border-white/5 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm text-white shadow-xl max-h-[90vh] overflow-y-auto"
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-blue-400">{prefill ? "Edit Trade" : "Log Trade"}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>

          <div className="space-y-3">
            {/* Symbol + Side */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Symbol</label>
                <input value={form.symbol} onChange={e => set("symbol", e.target.value.toUpperCase())} placeholder="EURUSD" className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 uppercase" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Side</label>
                <div className="flex rounded-xl overflow-hidden border border-white/10">
                  {["Long","Short"].map(s => (
                    <button key={s} onClick={() => set("side", s)} className={`px-4 py-2.5 text-sm font-medium transition ${form.side === s ? (s === "Long" ? "bg-green-500 text-white" : "bg-red-500 text-white") : "bg-[#1a1a1a] text-gray-500"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Entry / Exit / Size */}
            <div className="grid grid-cols-3 gap-2">
              {[["Entry","entry","Entry price"],["Exit","exit","Exit price"],["Size","size","Lot/units"]].map(([label,key,ph]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input type="number" value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                </div>
              ))}
            </div>

            {/* PnL preview */}
            {pnl !== null && (
              <motion.div className={`rounded-xl px-4 py-2.5 text-center border ${pnl >= 0 ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="text-lg font-bold">{pnl >= 0 ? "+" : ""}{pnl}</span>
                <span className="text-xs ml-2 opacity-60">{rr}% move</span>
              </motion.div>
            )}

            {/* Setup */}
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Setup type</label>
              <div className="flex flex-wrap gap-1.5">
                {SETUPS.map(s => (
                  <button key={s} onClick={() => set("setup", form.setup === s ? "" : s)} className={`px-3 py-1 rounded-lg text-xs border transition ${form.setup === s ? "bg-blue-500/15 border-blue-500 text-blue-400" : "bg-[#1a1a1a] border-white/10 text-gray-500 hover:border-white/20"}`}>{s}</button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Notes / Analysis</label>
              <textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Pre-trade thesis, execution notes, lessons learned…" className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-white/20 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.symbol} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 disabled:opacity-40 transition">
                {saving ? "Saving…" : "Save Trade"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
