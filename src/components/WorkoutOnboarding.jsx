import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Dumbbell } from "lucide-react";

const STEPS = [
  { key:"age",        label:"How old are you?",                  type:"number", placeholder:"e.g. 25", unit:"years" },
  { key:"weight",     label:"What's your current weight?",        type:"number", placeholder:"e.g. 80", unit:"kg" },
  { key:"height",     label:"What's your height?",               type:"number", placeholder:"e.g. 178", unit:"cm" },
  { key:"sex",        label:"Biological sex",                    type:"select", options:["Male","Female"] },
  { key:"experience", label:"Training experience level",         type:"select", options:["Beginner (< 1 year)","Intermediate (1–3 years)","Advanced (3+ years)"] },
  { key:"goal",       label:"Primary goal",                      type:"select", options:["Build Muscle","Lose Fat","Build Muscle & Lose Fat","Improve Fitness"] },
  { key:"days",       label:"Days per week you can train",        type:"select", options:["2 days","3 days","4 days","5 days","6 days"] },
  { key:"timeline",   label:"How long do you want your program?", type:"select", options:["4 weeks","8 weeks","12 weeks","16 weeks"] },
];

export default function WorkoutOnboarding({ onComplete, loading }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});

  const current = STEPS[step];
  const val = form[current.key] || "";
  const isLast = step === STEPS.length - 1;
  const canNext = !!val;

  const next = () => {
    if (!canNext) return;
    if (isLast) { onComplete(form); return; }
    setStep(s => s + 1);
  };

  const handleKey = e => { if (e.key === "Enter" && canNext) next(); };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 pb-24">
      <div className="glow-bg glow-workout" />
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <Dumbbell size={22} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 tracking-widest uppercase">Setup</p>
            <h1 className="text-xl font-bold text-white font-display">Build Your Program</h1>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#1a1a1a] h-1 rounded-full mb-8 overflow-hidden">
          <motion.div
            className="h-1 bg-red-500 rounded-full"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Step counter */}
        <p className="text-xs text-gray-500 mb-3">{step + 1} / {STEPS.length}</p>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">{current.label}</h2>

            {current.type === "select" ? (
              <div className="space-y-3">
                {current.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setForm(f => ({ ...f, [current.key]: opt })); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      val === opt
                        ? "bg-red-500/15 border-red-500 text-white"
                        : "bg-[#111] border-white/5 text-gray-400 hover:border-red-500/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="relative">
                <input
                  type={current.type}
                  value={val}
                  onChange={e => setForm(f => ({ ...f, [current.key]: e.target.value }))}
                  onKeyDown={handleKey}
                  placeholder={current.placeholder}
                  autoFocus
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-red-500 pr-14"
                />
                {current.unit && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">{current.unit}</span>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-white disabled:opacity-30 transition"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            onClick={next}
            disabled={!canNext || loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              canNext && !loading
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-[#222] text-gray-600 cursor-not-allowed"
            }`}
          >
            {loading ? "Generating…" : isLast ? "Generate My Plan" : "Next"}
            {!loading && <ChevronRight size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
