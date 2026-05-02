import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronDown, ChevronUp, Bot, Loader2 } from "lucide-react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useCoach } from "../context/CoachContext";
import TradeModal from "../components/TradeModal";
import TradeStats from "../components/TradeStats";

export default function Trading() {
  const { askCoach } = useCoach();
  const [trades, setTrades]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiFeedback, setAiFeedback] = useState({});

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async u => {
      if (!u) { setLoading(false); return; }
      try {
        const q = query(collection(db, "users", u.uid, "trading"), orderBy("createdAt", "desc"));
        try {
          const snap = await getDocs(q);
          setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {
          const snap = await getDocs(collection(db, "users", u.uid, "trading"));
          setTrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        console.error("Failed to load trades:", e);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const handleSave = async (tradeData) => {
    const u = auth.currentUser;
    if (!u) { alert("Not signed in"); return; }
    try {
      const ref = await addDoc(collection(db, "users", u.uid, "trading"), {
        ...tradeData,
        time: new Date(),
        createdAt: new Date(),
      });
      setTrades(prev => [{ id: ref.id, ...tradeData, createdAt: new Date() }, ...prev]);
    } catch (e) {
      console.error("Trade save error:", e?.message, e?.code);
      alert(`Trade save failed: ${e?.code === "permission-denied" ? "Firestore rules expired — update in Firebase Console" : e?.message}`);
    }
  };

  const handleDelete = async (id) => {
    const u = auth.currentUser;
    if (!u) return;
    await deleteDoc(doc(db, "users", u.uid, "trading", id));
    setTrades(prev => prev.filter(t => t.id !== id));
    setExpanded(null);
  };

  const getAiFeedback = async (trade) => {
    setAiLoading(trade.id);
    const msg = `Review this futures trade and give concise feedback (3-4 sentences max):
Symbol: ${trade.symbol} | Side: ${trade.side} | Entry: ${trade.entry} | Exit: ${trade.exit || "open"} | Contracts: ${trade.contracts || trade.size || 1} | P&L: $${trade.pnl}
Rules followed: ${trade.setup || "not specified"}
Notes: ${trade.notes || "none"}

Focus on: rule adherence, execution quality, and one improvement.`;
    const reply = await askCoach({ messages: [{ role: "user", content: msg }], topic: "trading" });
    setAiFeedback(prev => ({ ...prev, [trade.id]: reply }));
    setAiLoading(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-28 px-4 pt-6">
      <div className="glow-bg glow-trading" />
      <div className="relative z-10 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-blue-400 tracking-widest uppercase font-display">Trading</p>
            <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-500/15 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-500/25 transition"
          >
            <Plus size={15} /> Log Trade
          </button>
        </div>

        {/* Stats */}
        <TradeStats trades={trades} />

        {/* Trade list */}
        {trades.length === 0 ? (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-8 text-center">
            <p className="text-gray-600 text-sm">No trades logged yet.</p>
            <p className="text-gray-700 text-xs mt-1">Log your first trade to start tracking performance.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map(trade => {
              const win = (trade.pnl || 0) > 0;
              const flat = (trade.pnl || 0) === 0;
              const isOpen = expanded === trade.id;

              return (
                <div key={trade.id} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                  {/* Trade row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : trade.id)}
                  >
                    {/* Side badge */}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${trade.side === "Long" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {trade.side}
                    </span>

                    {/* Symbol */}
                    <span className="text-white font-semibold text-sm">{trade.symbol}</span>

                    {/* Setup tag */}
                    {trade.setup && (
                      <span className="text-xs text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-lg hidden sm:inline">{trade.setup}</span>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* PnL */}
                    <span className={`text-sm font-bold ${win ? "text-green-400" : flat ? "text-gray-400" : "text-red-400"}`}>
                      {(trade.pnl || 0) >= 0 ? "+" : ""}${Math.abs(trade.pnl || 0).toLocaleString()}
                    </span>

                    {/* Expand icon */}
                    {isOpen ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/5 space-y-3">
                          {/* Entry / Exit */}
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            {[["Entry", trade.entry],["Exit", trade.exit || "—"],["Contracts", trade.contracts || trade.size || "—"]].map(([l,v]) => (
                              <div key={l} className="bg-[#1a1a1a] rounded-xl p-2.5 text-center">
                                <p className="text-sm font-bold text-white">{v}</p>
                                <p className="text-xs text-gray-600">{l}</p>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          {trade.notes && (
                            <div className="bg-[#1a1a1a] rounded-xl p-3">
                              <p className="text-xs text-gray-500 mb-1">Notes</p>
                              <p className="text-sm text-gray-300 leading-relaxed">{trade.notes}</p>
                            </div>
                          )}

                          {/* AI Feedback */}
                          {aiFeedback[trade.id] && (
                            <motion.div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Bot size={12} className="text-blue-400" />
                                <p className="text-xs text-blue-400 font-medium">Coach Feedback</p>
                              </div>
                              <p className="text-sm text-gray-300 leading-relaxed">{aiFeedback[trade.id]}</p>
                            </motion.div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => getAiFeedback(trade)}
                              disabled={aiLoading === trade.id}
                              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition disabled:opacity-50"
                            >
                              {aiLoading === trade.id ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                              {aiLoading === trade.id ? "Analyzing…" : "Get Feedback"}
                            </button>
                            <button
                              onClick={() => handleDelete(trade.id)}
                              className="px-4 py-2 rounded-xl text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && <TradeModal onClose={() => setShowModal(false)} onSave={handleSave} />}
      </AnimatePresence>
    </div>
  );
}
