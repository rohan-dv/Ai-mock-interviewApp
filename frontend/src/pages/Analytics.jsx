import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Skeleton } from "../components/ui/skeleton";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { TrendingUp, AlertTriangle, Target, BarChart3 } from "lucide-react";

const Stat = ({ label, value, suffix = "/100" }) => (
  <div className="bg-[#0F1115] border border-white/10 rounded-lg p-5">
    <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 mb-2">{label}</div>
    <div className="font-display text-3xl font-bold text-white">
      {value}<span className="text-base text-zinc-500 ml-1">{suffix}</span>
    </div>
  </div>
);

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/overview")
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/2 bg-white/5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 bg-white/5" />)}
        </div>
        <Skeleton className="h-80 bg-white/5" />
      </div>
    );
  }

  const noData = !data?.completed_interviews;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
      data-testid="analytics-page"
    >
      <div>
        <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">// analytics</div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Performance Analytics</h1>
        <p className="text-zinc-400 mt-2">Trends, mastery, and what to work on next.</p>
      </div>

      {noData ? (
        <div className="bg-[#0F1115] border border-dashed border-white/10 rounded-lg p-12 text-center">
          <BarChart3 className="w-10 h-10 text-zinc-600 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-zinc-400 mb-2">No completed interviews yet.</p>
          <p className="text-sm text-zinc-500">
            <Link to="/interview/setup" className="text-[#00FF94] hover:underline">Run your first interview</Link> to start seeing analytics.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Completed" value={data.completed_interviews} suffix=" runs" />
            <Stat label="Avg overall" value={data.average_overall} />
            <Stat label="Avg technical" value={data.average_technical} />
            <Stat label="Avg confidence" value={data.average_confidence} />
          </div>

          {/* Score Trend */}
          <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00FF94]" strokeWidth={1.5} />
                <span className="font-mono text-xs tracking-widest uppercase text-[#00FF94]">score trend</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.score_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#52525b" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                <Line type="monotone" dataKey="overall" stroke="#00FF94" strokeWidth={2.5} dot={{ fill: "#00FF94", r: 4 }} />
                <Line type="monotone" dataKey="technical" stroke="#60a5fa" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="communication" stroke="#f0abfc" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="confidence" stroke="#fbbf24" strokeWidth={1.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* By type */}
          {data.by_type?.length > 0 && (
            <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-[#00FF94]" strokeWidth={1.5} />
                <span className="font-mono text-xs tracking-widest uppercase text-[#00FF94]">by interview type</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.by_type}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="type" stroke="#a1a1aa" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#52525b" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} cursor={{ fill: "rgba(0, 255, 148,0.05)" }} />
                  <Bar dataKey="average" fill="#00FF94" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Topic mastery + weak topics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-[#00FF94]" strokeWidth={1.5} />
                <span className="font-mono text-xs tracking-widest uppercase text-[#00FF94]">topic mastery</span>
              </div>
              {data.topic_mastery?.length === 0 ? (
                <p className="text-sm text-zinc-500">No topic data yet.</p>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
                  {data.topic_mastery.slice(0, 10).map((t) => (
                    <div key={t.topic}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-zinc-300">{t.topic}</span>
                        <span className="font-mono text-xs text-[#00FF94]">{t.score}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00FF94]" style={{ width: `${t.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
                <span className="font-mono text-xs tracking-widest uppercase text-orange-400">weak topics</span>
              </div>
              {data.weak_topics?.length === 0 ? (
                <p className="text-sm text-zinc-500">No weak topics yet — keep practicing.</p>
              ) : (
                <ul className="space-y-2">
                  {data.weak_topics.map((t) => (
                    <li key={t.topic} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-md">
                      <span className="text-sm text-zinc-300">{t.topic}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 font-mono">{t.count}x</span>
                        <span className="font-mono text-sm text-orange-400">{t.score}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
