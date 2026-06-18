import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { CheckCircle2, AlertTriangle, Lightbulb, BookOpen, ArrowRight, Trophy, Brain } from "lucide-react";

const ScoreCard = ({ label, value }) => (
  <div className="bg-[#0F1115] border border-white/10 rounded-lg p-5">
    <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 mb-2">{label}</div>
    <div className="font-display text-4xl font-bold text-white mb-3">
      {value}<span className="text-base text-zinc-500 ml-1">/100</span>
    </div>
    <Progress value={value} className="h-1 bg-white/5" />
  </div>
);

export default function FeedbackReport() {
  const { sessionId } = useParams();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("generating");

  useEffect(() => {
    let cancelled = false;
    let timer;

    const poll = async () => {
      try {
        // Check session status first (cheap, no 404s)
        const s = await api.get(`/interviews/${sessionId}`);
        if (cancelled) return;
        const fs = s.data.feedback_status || "generating";
        setStatus(fs);

        if (fs === "ready") {
          const fb = await api.get(`/feedback/by-session/${sessionId}`);
          if (cancelled) return;
          setFeedback(fb.data);
          setLoading(false);
          return;
        }
        if (fs === "error") {
          setLoading(false);
          return;
        }
        timer = setTimeout(poll, 2500);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="feedback-loading">
        <div className="bg-[#0F1115] border border-white/10 rounded-lg p-10 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#00FF94] animate-pulse" />
            <span className="font-mono text-xs tracking-widest uppercase text-[#00FF94]">
              {status === "error" ? "Generation error" : "ARIA is evaluating your interview..."}
            </span>
          </div>
          <p className="text-zinc-400 mb-6">
            {status === "error"
              ? "Something went wrong while generating your feedback. Please retry."
              : "Scoring across technical depth, communication, confidence, and problem-solving. Building your personalized study plan."}
          </p>
          <div className="space-y-3 max-w-md mx-auto">
            <Skeleton className="h-3 w-full bg-white/5" />
            <Skeleton className="h-3 w-5/6 bg-white/5" />
            <Skeleton className="h-3 w-4/6 bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="text-center py-20 text-zinc-400">
        Feedback not ready yet.{" "}
        <Link to="/dashboard" className="text-[#00FF94] hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const radarData = (feedback.topic_scores || []).map((t) => ({ topic: t.topic, score: t.score }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
      data-testid="feedback-page"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">// interview report</div>
          <h1 className="font-display text-4xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#00FF94]" strokeWidth={1.5} />
            Performance Report
          </h1>
          <p className="text-zinc-400 mt-2 max-w-2xl">{feedback.summary}</p>
        </div>
        <Link to={`/study-plan/${sessionId}`}>
          <Button size="lg" className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold h-12 px-6" data-testid="view-study-plan-btn">
            <BookOpen className="w-4 h-4 mr-2" /> View study plan <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Overall hero score */}
      <div className="bg-[#0F1115] border border-white/10 rounded-lg p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="absolute inset-0" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
            <circle
              cx="50" cy="50" r="44"
              stroke="#00FF94" strokeWidth="6" fill="none"
              strokeDasharray={`${(feedback.overall_score / 100) * 276.46} 276.46`}
              strokeLinecap="round" transform="rotate(-90 50 50)"
              style={{ filter: "drop-shadow(0 0 8px rgba(0, 255, 148,0.4))" }}
            />
          </svg>
          <div className="text-center relative">
            <div className="font-display text-5xl font-black text-white">{feedback.overall_score}</div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">/ 100</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">overall score</div>
          <h2 className="font-display text-2xl font-bold mb-2">
            {feedback.overall_score >= 80 ? "Exceptional performance" :
             feedback.overall_score >= 65 ? "Strong showing" :
             feedback.overall_score >= 50 ? "Solid foundation" : "Plenty to build on"}
          </h2>
          <p className="text-zinc-400">{feedback.summary}</p>
        </div>
      </div>

      {/* Score grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard label="Technical" value={feedback.technical_score} />
        <ScoreCard label="Communication" value={feedback.communication_score} />
        <ScoreCard label="Confidence" value={feedback.confidence_score} />
        <ScoreCard label="Problem-solving" value={feedback.problem_solving_score} />
      </div>

      {/* Radar + Topic scores */}
      {radarData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
            <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-4">topic radar</div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="topic" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#52525b", fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="#00FF94" fill="#00FF94" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
            <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-4">topic scores</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={radarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" domain={[0, 100]} stroke="#52525b" fontSize={11} />
                <YAxis type="category" dataKey="topic" stroke="#a1a1aa" fontSize={11} width={110} />
                <Tooltip contentStyle={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} cursor={{ fill: "rgba(0, 255, 148,0.05)" }} />
                <Bar dataKey="score" fill="#00FF94" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section icon={CheckCircle2} title="Strengths" testid="strengths" iconColor="text-[#00FF94]">
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-[#00FF94] mt-0.5 shrink-0" strokeWidth={1.5} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section icon={AlertTriangle} title="Weaknesses" testid="weaknesses" iconColor="text-orange-400">
          <ul className="space-y-2">
            {feedback.weaknesses.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Improvement */}
      <Section icon={Lightbulb} title="Improvement suggestions" testid="improvements" iconColor="text-[#00FF94]">
        <ul className="space-y-3">
          {feedback.improvement_suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-3 p-3 rounded-md bg-white/[0.02] border border-white/5">
              <span className="font-mono text-xs text-[#00FF94] mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-zinc-300">{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Per-question */}
      {feedback.per_question?.length > 0 && (
        <div>
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#00FF94]" strokeWidth={1.5} /> Question breakdown
          </h3>
          <div className="space-y-3">
            {feedback.per_question.map((q, i) => (
              <div key={i} className="bg-[#0F1115] border border-white/10 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="font-medium text-white flex-1">{q.question}</div>
                  <div className="font-mono text-2xl font-bold text-[#00FF94] shrink-0">{q.score}</div>
                </div>
                <p className="text-sm text-zinc-400">{q.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Section({ icon: Icon, title, children, testid, iconColor = "text-[#00FF94]" }) {
  return (
    <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6" data-testid={testid}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.5} />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
