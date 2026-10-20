import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronDown, ChevronUp, Bot, Loader2 } from "lucide-react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useCoach } from "../context/useCoach";
import TradeModal from "../components/TradeModal";
import TradeStats from "../components/TradeStats";
import { formatPnl } from "../lib/dashboard";

export default function Trading() {
  const { askCoach } = useCoach();
  const [trades, setTrades]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiFeedback, setAiFeedback] = useState({});
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);

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
        setError("Your journal could not be loaded. Refresh to try again.");
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const handleSave = async (tradeData) => {
    const u = auth.currentUser;
    if (!u) throw new Error("Please sign in to save your trade.");
    try {
      const ref = await addDoc(collection(db, "users", u.uid, "trading"), {
        ...tradeData,
        time: new Date(),
        createdAt: new Date(),
      });
      setTrades(prev => [{ id: ref.id, ...tradeData, createdAt: new Date() }, ...prev]);
    } catch (e) {
      console.error("Trade save error:", e?.message, e?.code);
      throw new Error("Your trade could not be saved. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (deleting || !window.confirm("Delete this trade? This cannot be undone.")) return;
    const u = auth.currentUser;
    if (!u) { setError("Please sign in to delete a trade."); return; }
    setDeleting(id);
    setError("");
    try {
      await deleteDoc(doc(db, "users", u.uid, "trading", id));
      setTrades(prev => prev.filter(t => t.id !== id));
      setExpanded(null);
    } catch {
      setError("This trade could not be deleted. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const getAiFeedback = async (trade) => {
    setAiLoading(trade.id);
    const msg = `Review this futures trade and give concise feedback (3-4 sentences max):
Symbol: ${trade.symbol} | Side: ${trade.side} | Entry: ${trade.entry} | Exit: ${trade.exit || "open"} | Contracts: ${trade.contracts || trade.size || 1} | P&L: $${trade.pnl}
Rules followed: ${trade.setup || "not specified"}
Notes: ${trade.notes || "none"}

Focus on: rule adherence, execution quality, and one improvement.`;
    try {
      const reply = await askCoach({ messages: [{ role: "user", content: msg }], topic: "trading" });
      setAiFeedback(prev => ({ ...prev, [trade.id]: reply }));
    } catch {
      setError("Feedback is unavailable right now. Please try again.");
    } finally {
      setAiLoading(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="feature-page">
      <div className="glow-bg glow-trading" />
      <div className="relative z-10 feature-content">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs text-blue-400 tracking-widest uppercase font-display">Trading</p>
            <h1 className="page-heading">Trade Journal</h1>
            <p className="page-description">Track your execution. Learn from every position.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="button-primary"
          >
            <Plus size={15} /> Log Trade
          </button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">{error}</p>}

        {/* Stats */}
        <TradeStats trades={trades} />

        {/* Trade list */}
        {trades.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-white text-lg font-semibold">Every trade tells a story.</p>
            <p className="text-gray-400 text-sm mt-2">Log your first trade to start tracking performance.</p>
            <button onClick={() => setShowModal(true)} className="button-primary mt-5">Log your first trade</button>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map(trade => {
              const win = (trade.pnl || 0) > 0;
              const flat = (trade.pnl || 0) === 0;
              const isOpen = expanded === trade.id;

              return (
                <div key={trade.id} className="panel !p-0 overflow-hidden">
                  {/* Trade row */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`trade-${trade.id}`}
                    className="w-full flex items-center gap-3 px-5 py-5 text-left hover:bg-white/[0.025] transition"
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
                      <span className="text-xs text-gray-400 bg-[#1a1a1a] px-2 py-0.5 rounded-lg hidden sm:inline">{trade.setup}</span>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* PnL */}
                    <span className={`text-sm font-bold ${win ? "text-green-400" : flat ? "text-gray-400" : "text-red-400"}`}>
                      {formatPnl(trade.pnl)}
                    </span>

                    {/* Expand icon */}
                    {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </button>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div id={`trade-${trade.id}`} className="px-5 pb-5 border-t border-white/5 space-y-3">
                          {/* Entry / Exit */}
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            {[["Entry", trade.entry],["Exit", trade.exit || "—"],["Contracts", trade.contracts || trade.size || "—"]].map(([l,v]) => (
                              <div key={l} className="bg-[#1a1a1a] rounded-xl p-2.5 text-center">
                                <p className="text-sm font-bold text-white">{v}</p>
                                <p className="text-xs text-gray-400">{l}</p>
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
                              disabled={aiLoading !== null}
                              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition disabled:opacity-50"
                            >
                              {aiLoading === trade.id ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                              {aiLoading === trade.id ? "Analyzing…" : "Get Feedback"}
                            </button>
                            <button
                              onClick={() => handleDelete(trade.id)}
                              aria-label={`Delete ${trade.symbol} trade`}
                              disabled={deleting !== null}
                              className="px-4 py-2 rounded-xl text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition"
                            >
                              {deleting === trade.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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
