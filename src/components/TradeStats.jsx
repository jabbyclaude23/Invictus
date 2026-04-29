import React from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TradeStats({ trades = [] }) {
  if (!trades.length) return null;

  const wins    = trades.filter(t => (t.pnl || 0) > 0).length;
  const losses  = trades.filter(t => (t.pnl || 0) < 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  const totalPnl= trades.reduce((a, t) => a + (t.pnl || 0), 0);
  const avgPnl  = trades.length ? totalPnl / trades.length : 0;

  // streak
  let streak = 0, streakDir = null;
  for (const t of [...trades].reverse()) {
    const dir = (t.pnl || 0) >= 0 ? "W" : "L";
    if (!streakDir) streakDir = dir;
    if (dir === streakDir) streak++; else break;
  }

  // cumulative PnL chart data
  let cum = 0;
  const chartData = trades.map((t, i) => {
    cum += t.pnl || 0;
    return { i: i + 1, pnl: Math.round(cum * 100) / 100 };
  });

  const Stat = ({ label, value, color = "text-white" }) => (
    <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 mb-4">
      <h2 className="text-sm font-semibold text-blue-400 mb-3">Performance</h2>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <Stat label="Win Rate"  value={`${winRate}%`} color={winRate >= 50 ? "text-green-400" : "text-red-400"} />
        <Stat label="Total PnL" value={`${totalPnl >= 0 ? "+" : ""}${Math.round(totalPnl)}`} color={totalPnl >= 0 ? "text-green-400" : "text-red-400"} />
        <Stat label="Avg PnL"   value={`${avgPnl >= 0 ? "+" : ""}${Math.round(avgPnl)}`} color={avgPnl >= 0 ? "text-green-400" : "text-red-400"} />
        <Stat label={`${streakDir === "W" ? "Win" : "Loss"} Streak`} value={streak} color={streakDir === "W" ? "text-green-400" : "text-amber-400"} />
      </div>

      {chartData.length > 1 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="i" tick={{ fill: "#555", fontSize: 9 }} />
              <YAxis tick={{ fill: "#555", fontSize: 9 }} />
              <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #222", color: "#fff", fontSize: 11 }} />
              <Line type="monotone" dataKey="pnl" stroke={totalPnl >= 0 ? "#22c55e" : "#ef4444"} dot={false} strokeWidth={2} name="Cumulative PnL" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
