import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { History as HistoryIcon, ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/interviews")
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
      data-testid="history-page"
    >
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">// history</div>
          <h1 className="font-display text-4xl font-bold tracking-tight flex items-center gap-3">
            <HistoryIcon className="w-8 h-8 text-[#00FF94]" strokeWidth={1.5} />
            Interview History
          </h1>
        </div>
        <Link to="/interview/setup">
          <Button className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold" data-testid="history-new-interview-btn">
            <PlayCircle className="w-4 h-4 mr-2" /> New interview
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 bg-white/5" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-[#0F1115] border border-dashed border-white/10 rounded-lg p-12 text-center">
          <HistoryIcon className="w-10 h-10 text-zinc-600 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-zinc-400 mb-4">No interviews yet.</p>
          <Link to="/interview/setup">
            <Button className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold" data-testid="history-empty-cta">
              Start your first interview
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => {
            const isCompleted = s.status === "completed";
            const fs = s.feedback_status || "pending";
            const generating = isCompleted && fs === "generating";
            const link = isCompleted ? `/feedback/${s.id}` : `/interview/${s.id}`;
            let badge = { label: "In progress", classes: "border-orange-400/30 bg-orange-400/5 text-orange-400" };
            if (isCompleted && fs === "ready") badge = { label: "Completed", classes: "border-[#00FF94]/30 bg-[#00FF94]/5 text-[#00FF94]" };
            else if (generating) badge = { label: "Evaluating...", classes: "border-blue-400/30 bg-blue-400/5 text-blue-400" };
            else if (fs === "error") badge = { label: "Error", classes: "border-red-400/30 bg-red-400/5 text-red-400" };
            return (
              <Link
                key={s.id}
                to={link}
                className="block bg-[#0F1115] border border-white/10 hover:border-white/25 rounded-lg p-5 transition-colors"
                data-testid={`history-row-${s.id}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00FF94]" strokeWidth={1.5} />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{s.config.interview_type}</div>
                      <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                        {s.config.difficulty} · {s.config.total_questions} Qs · {new Date(s.started_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className={isCompleted ? "border-[#00FF94]/30 bg-[#00FF94]/5 text-[#00FF94]" : "border-orange-400/30 bg-orange-400/5 text-orange-400"}>
                      {isCompleted ? "Completed" : "In progress"}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
