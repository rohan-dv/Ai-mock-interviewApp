import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { ArrowRight, PlayCircle, FileUp, BarChart3, BookOpen, Trophy, TrendingUp, Brain, Mic } from "lucide-react";

const Stat = ({ label, value, suffix = "" }) => (
  <div className="bg-[#0F1115] border border-white/10 rounded-lg p-5">
    <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 mb-2">{label}</div>
    <div className="font-display text-3xl font-bold text-white">
      {value}
      {suffix && <span className="text-base text-zinc-500 ml-1">{suffix}</span>}
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/overview").then((r) => r.data),
      api.get("/resume/latest").then((r) => r.data).catch(() => null),
    ])
      .then(([o, r]) => { setOverview(o); setResume(r); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
      data-testid="dashboard-page"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-2">
            Welcome, <span className="text-[#00FF94]">{user?.name?.split(" ")[0]}</span>
          </h1>
        </div>
        <Link to="/interview/setup">
          <Button size="lg" className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold h-12 px-6" data-testid="quick-start-interview-btn">
            <PlayCircle className="w-4 h-4 mr-2" strokeWidth={2} /> Start interview
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-[110px] bg-white/5" />)
        ) : (
          <>
            <Stat label="Interviews" value={overview?.total_interviews ?? 0} />
            <Stat label="Avg overall" value={overview?.average_overall ?? 0} suffix="/100" />
            <Stat label="Avg technical" value={overview?.average_technical ?? 0} suffix="/100" />
            <Stat label="Avg confidence" value={overview?.average_confidence ?? 0} suffix="/100" />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/resume" className="group" data-testid="quick-resume-card">
          <div className="h-full bg-[#0F1115] border border-white/10 rounded-lg p-6 hover:border-white/25 transition-colors">
            <FileUp className="w-6 h-6 text-[#00FF94] mb-4" strokeWidth={1.5} />
            <h3 className="font-display text-lg font-semibold mb-1">
              {resume ? "Update resume" : "Upload resume"}
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              {resume ? `Latest: ${resume.filename}` : "Make every question resume-aware."}
            </p>
            <span className="text-xs font-mono uppercase tracking-widest text-[#00FF94] flex items-center gap-1">
              Go <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>
        <Link to="/analytics" className="group" data-testid="quick-analytics-card">
          <div className="h-full bg-[#0F1115] border border-white/10 rounded-lg p-6 hover:border-white/25 transition-colors">
            <BarChart3 className="w-6 h-6 text-[#00FF94] mb-4" strokeWidth={1.5} />
            <h3 className="font-display text-lg font-semibold mb-1">View analytics</h3>
            <p className="text-sm text-zinc-400 mb-4">Trends, weak topics, topic mastery — all in one place.</p>
            <span className="text-xs font-mono uppercase tracking-widest text-[#00FF94] flex items-center gap-1">
              Go <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>
        <Link to="/study-plan" className="group" data-testid="quick-study-plan-card">
          <div className="h-full bg-[#0F1115] border border-white/10 rounded-lg p-6 hover:border-white/25 transition-colors">
            <BookOpen className="w-6 h-6 text-[#00FF94] mb-4" strokeWidth={1.5} />
            <h3 className="font-display text-lg font-semibold mb-1">Study plan</h3>
            <p className="text-sm text-zinc-400 mb-4">Your personalized 4-week roadmap.</p>
            <span className="text-xs font-mono uppercase tracking-widest text-[#00FF94] flex items-center gap-1">
              Go <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>
      </div>

      {/* Recent interviews */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#00FF94]" strokeWidth={1.5} /> Recent interviews
        </h2>
        {loading ? (
          <Skeleton className="h-32 bg-white/5" />
        ) : overview?.recent?.length ? (
          <div className="bg-[#0F1115] border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5">
            {overview.recent.map((r) => (
              <Link
                key={r.feedback_id}
                to={`/feedback/${r.session_id}`}
                className="flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
                data-testid={`recent-interview-${r.session_id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-[#00FF94]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="font-medium text-white">{r.type}</div>
                    <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                      {r.difficulty} · {new Date(r.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-mono text-2xl font-semibold text-[#00FF94]">{r.overall_score}</div>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-[#0F1115] border border-dashed border-white/10 rounded-lg p-10 text-center">
            <Mic className="w-8 h-8 text-zinc-600 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-zinc-400 mb-4">No interviews yet. Run your first one.</p>
            <Link to="/interview/setup">
              <Button className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold" data-testid="empty-state-start-btn">
                <PlayCircle className="w-4 h-4 mr-2" /> Start now
              </Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
