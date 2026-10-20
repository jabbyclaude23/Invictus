import React from "react";
import { formatPnl } from "../lib/dashboard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TradeStats({ trades = [] }) {
  if (!trades.length) return null;

  const wins    = trades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  const totalPnl= trades.reduce((a, t) => a + (Number(t.pnl) || 0), 0);
  const avgPnl  = trades.length ? totalPnl / trades.length : 0;

  // streak
  let streak = 0, streakDir = null;
  for (const t of trades) {
    const dir = (t.pnl || 0) >= 0 ? "W" : "L";
    if (!streakDir) streakDir = dir;
    if (dir === streakDir) streak++; else break;
  }

  // cumulative PnL chart data
  let cum = 0;
  const chartData = [...trades].reverse().map((t, i) => {
    cum += Number(t.pnl) || 0;
    return { i: i + 1, pnl: Math.round(cum * 100) / 100 };
  });

  const Stat = ({ label, value, color = "text-white" }) => (
    <div className="bg-white/[0.025] border border-white/5 rounded-xl p-4 text-left">
      <p className={`text-xl sm:text-2xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className="panel p-5 sm:p-6 mb-6">
      <h2 className="text-sm font-semibold text-white mb-5">Performance</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Win Rate"  value={`${winRate}%`} color={winRate >= 50 ? "text-green-400" : "text-red-400"} />
        <Stat label="Total PnL" value={formatPnl(totalPnl)} color={totalPnl >= 0 ? "text-green-400" : "text-red-400"} />
        <Stat label="Avg PnL"   value={formatPnl(avgPnl)} color={avgPnl >= 0 ? "text-green-400" : "text-red-400"} />
        <Stat label={`${streakDir === "W" ? "Win" : "Loss"} Streak`} value={streak} color={streakDir === "W" ? "text-green-400" : "text-amber-400"} />
      </div>

      {chartData.length > 1 && (
        <div className="h-44 sm:h-52" role="img" aria-label="Cumulative profit and loss in chronological trade order">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="i" tick={{ fill: "#929292", fontSize: 9 }} />
              <YAxis tick={{ fill: "#929292", fontSize: 9 }} />
              <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #222", color: "#fff", fontSize: 11 }} />
              <Line isAnimationActive={false} type="monotone" dataKey="pnl" stroke={totalPnl >= 0 ? "#22c55e" : "#ef4444"} dot={false} strokeWidth={2} name="Cumulative PnL" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
