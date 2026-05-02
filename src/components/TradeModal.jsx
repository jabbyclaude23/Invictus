import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

// Futures contract multipliers ($ per point)
const SYMBOLS = ["NQ","MNQ","ES","MES","RTY"];
const MULTIPLIER = { NQ: 20, MNQ: 2, ES: 50, MES: 5, RTY: 50 };

// Your trading rules / setup tags
const RULES = [
  "15m Confirm",
  "Trend Aligned",
  "EMA Stack",
  "13 EMA Entry",
  "Flag/Structure",
  "Key Level",
  "HOD/LOD Trim",
  "Time Window",
];

export default function TradeModal({ onClose, onSave, prefill = null }) {
  const [form, setForm] = useState({
    symbol:    "NQ",
    side:      "Long",
    entry:     "",
    exit:      "",
    contracts: "1",
    manualPnl: "",
    useManual: false,
    rules:     [],
    notes:     "",
    ...prefill,
  });
  const [saving, setSaving]       = useState(false);
  const [symbolOpen, setSymbolOpen] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleRule = (r) => setForm(f => ({
    ...f,
    rules: f.rules.includes(r) ? f.rules.filter(x => x !== r) : [...f.rules, r],
  }));

  // Auto P&L via futures multiplier
  const autoPnl = (() => {
    const e  = parseFloat(form.entry);
    const x  = parseFloat(form.exit);
    const c  = parseFloat(form.contracts) || 1;
    if (!e || !x) return null;
    const points = form.side === "Long" ? x - e : e - x;
    return Math.round(points * (MULTIPLIER[form.symbol] || 1) * c * 100) / 100;
  })();

  const displayPnl = form.useManual
    ? (form.manualPnl !== "" ? parseFloat(form.manualPnl) : null)
    : autoPnl;

  const handleSave = async () => {
    if (!form.entry) return;
    setSaving(true);
    await onSave({
      symbol:    form.symbol,
      side:      form.side,
      entry:     parseFloat(form.entry),
      exit:      parseFloat(form.exit)   || 0,
      contracts: parseFloat(form.contracts) || 1,
      setup:     form.rules.join(", "),
      notes:     form.notes,
      pnl:       displayPnl ?? 0,
    });
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
          className="bg-[#111] border border-white/5 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm text-white shadow-xl max-h-[92vh] overflow-y-auto"
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-400">{prefill ? "Edit Trade" : "Log Trade"}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>

          <div className="space-y-3">
            {/* Symbol dropdown + Side */}
            <div className="flex gap-2">
              {/* Symbol */}
              <div className="relative flex-1">
                <label className="text-xs text-gray-500 block mb-1">Symbol</label>
                <button
                  onClick={() => setSymbolOpen(o => !o)}
                  className="w-full flex items-center justify-between bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white hover:border-blue-500/40 transition"
                >
                  <span className="font-semibold text-blue-300">{form.symbol}</span>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>
                {symbolOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl">
                    {SYMBOLS.map(s => (
                      <button
                        key={s}
                        onClick={() => { set("symbol", s); setSymbolOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition ${
                          form.symbol === s ? "bg-blue-500/20 text-blue-300" : "text-gray-300 hover:bg-white/5"
                        }`}
                      >
                        <span className="font-medium">{s}</span>
                        <span className="text-xs text-gray-500 ml-2">${MULTIPLIER[s]}/pt</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Side */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Side</label>
                <div className="flex rounded-xl overflow-hidden border border-white/10">
                  {["Long","Short"].map(s => (
                    <button
                      key={s}
                      onClick={() => set("side", s)}
                      className={`px-4 py-2.5 text-sm font-medium transition ${
                        form.side === s
                          ? s === "Long" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                          : "bg-[#1a1a1a] text-gray-500"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Entry / Exit / Contracts */}
            <div className="grid grid-cols-3 gap-2">
              {[["Entry","entry","Price"],["Exit","exit","Price (opt)"],["Contracts","contracts","# contracts"]].map(([label,key,ph]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={ph}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    style={{ fontSize: 16 }}
                  />
                </div>
              ))}
            </div>

            {/* P&L section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-500">P&amp;L</label>
                <button
                  onClick={() => set("useManual", !form.useManual)}
                  className="text-xs text-gray-600 hover:text-blue-400 transition"
                >
                  {form.useManual ? "Use auto-calc" : "Enter manually"}
                </button>
              </div>

              {form.useManual ? (
                <div className="relative">
                  <input
                    type="number"
                    value={form.manualPnl}
                    onChange={e => set("manualPnl", e.target.value)}
                    placeholder="e.g. 320 or -150"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 pr-10"
                    style={{ fontSize: 16 }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                </div>
              ) : (
                autoPnl !== null ? (
                  <motion.div
                    className={`rounded-xl px-4 py-2.5 text-center border ${
                      autoPnl >= 0 ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  >
                    <span className="text-lg font-bold">{autoPnl >= 0 ? "+" : ""}${autoPnl.toLocaleString()}</span>
                    <span className="text-xs ml-2 opacity-60">
                      {Math.abs(parseFloat(form.exit) - parseFloat(form.entry)).toFixed(2)} pts x {form.contracts} contract{form.contracts !== "1" ? "s" : ""} x ${MULTIPLIER[form.symbol]}/pt
                    </span>
                  </motion.div>
                ) : (
                  <p className="text-xs text-gray-600 bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-2.5">
                    Enter entry + exit to auto-calculate
                  </p>
                )
              )}
            </div>

            {/* Rules / Setup tags */}
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Rules followed</label>
              <div className="flex flex-wrap gap-1.5">
                {RULES.map(r => (
                  <button
                    key={r}
                    onClick={() => toggleRule(r)}
                    className={`px-3 py-1 rounded-lg text-xs border transition ${
                      form.rules.includes(r)
                        ? "bg-blue-500/15 border-blue-500 text-blue-400"
                        : "bg-[#1a1a1a] border-white/10 text-gray-500 hover:border-white/20"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Notes / Analysis</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Pre-trade thesis, execution notes, lessons learned..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none"
                style={{ fontSize: 16 }}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.entry}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 disabled:opacity-40 transition"
              >
                {saving ? "Saving..." : "Save Trade"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
