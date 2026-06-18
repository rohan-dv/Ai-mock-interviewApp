import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { toast } from "sonner";
import { PlayCircle, MessageSquare, Mic, Brain, Code2, LineChart, Server, Layers, Sparkles, Heart, BookOpen } from "lucide-react";

const TYPES = [
  { id: "HR", label: "HR", icon: Heart, desc: "Behavioral, culture-fit, motivation" },
  { id: "DSA", label: "DSA", icon: Code2, desc: "Data structures & algorithms" },
  { id: "System Design", label: "System Design", icon: Server, desc: "Architecture, scalability, trade-offs" },
  { id: "Backend", label: "Backend", icon: Layers, desc: "APIs, databases, infrastructure" },
  { id: "Frontend", label: "Frontend", icon: LineChart, desc: "React, performance, UX" },
  { id: "AI/ML", label: "AI / ML", icon: Sparkles, desc: "Models, MLOps, deep learning" },
  { id: "Behavioral", label: "Behavioral", icon: BookOpen, desc: "STAR stories, leadership, conflict" },
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [type, setType] = useState("DSA");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [duration, setDuration] = useState("20");
  const [questions, setQuestions] = useState("6");
  const [company, setCompany] = useState("General");
  const [mode, setMode] = useState("text");
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      const res = await api.post("/interviews", {
        config: {
          interview_type: type,
          difficulty,
          duration_minutes: parseInt(duration),
          total_questions: parseInt(questions),
          target_company: company || "General",
          mode,
        },
      });
      toast.success("Interview ready");
      navigate(`/interview/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-4xl"
      data-testid="interview-setup-page"
    >
      <div>
        <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">// new session</div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Configure your interview</h1>
        <p className="text-zinc-400 mt-2">Pick a track, difficulty, and mode. ARIA does the rest.</p>
      </div>

      {/* Type selection */}
      <div>
        <Label className="text-zinc-300 mb-4 block">Interview Type</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {TYPES.map((t) => {
            const active = type === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                data-testid={`type-${t.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                className={`text-left p-4 rounded-lg border transition-all ${
                  active
                    ? "bg-[#00FF94]/10 border-[#00FF94] neon-ring"
                    : "bg-[#0F1115] border-white/10 hover:border-white/25"
                }`}
              >
                <t.icon className={`w-5 h-5 mb-2 ${active ? "text-[#00FF94]" : "text-zinc-400"}`} strokeWidth={1.5} />
                <div className={`font-display font-semibold text-sm ${active ? "text-white" : "text-zinc-200"}`}>{t.label}</div>
                <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <Label className="text-zinc-300 mb-4 block">Difficulty</Label>
        <div className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                data-testid={`difficulty-${d.toLowerCase()}`}
                className={`py-3 px-4 rounded-lg border transition-all font-medium ${
                  active
                    ? "bg-[#00FF94]/10 border-[#00FF94] text-white"
                    : "bg-[#0F1115] border-white/10 hover:border-white/25 text-zinc-300"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-zinc-300 mb-2 block">Total questions</Label>
          <Select value={questions} onValueChange={setQuestions}>
            <SelectTrigger className="bg-[#0F1115] border-white/10 h-11" data-testid="questions-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["3", "5", "6", "8", "10"].map((n) => (
                <SelectItem key={n} value={n}>{n} questions</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-zinc-300 mb-2 block">Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="bg-[#0F1115] border-white/10 h-11" data-testid="duration-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["10", "15", "20", "30", "45", "60"].map((n) => (
                <SelectItem key={n} value={n}>{n} minutes</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-zinc-300 mb-2 block">Target company</Label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Google, Stripe, startup..."
            className="bg-[#0F1115] border-white/10 h-11"
            data-testid="company-input"
          />
        </div>
      </div>

      {/* Mode */}
      <div>
        <Label className="text-zinc-300 mb-4 block">Response mode</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("text")}
            data-testid="mode-text"
            className={`p-4 rounded-lg border text-left transition-all ${
              mode === "text" ? "bg-[#00FF94]/10 border-[#00FF94]" : "bg-[#0F1115] border-white/10 hover:border-white/25"
            }`}
          >
            <MessageSquare className="w-5 h-5 text-[#00FF94] mb-2" strokeWidth={1.5} />
            <div className="font-display font-semibold">Text</div>
            <div className="text-xs text-zinc-500 mt-1">Type your answers</div>
          </button>
          <button
            onClick={() => setMode("voice")}
            data-testid="mode-voice"
            className={`p-4 rounded-lg border text-left transition-all ${
              mode === "voice" ? "bg-[#00FF94]/10 border-[#00FF94]" : "bg-[#0F1115] border-white/10 hover:border-white/25"
            }`}
          >
            <Mic className="w-5 h-5 text-[#00FF94] mb-2" strokeWidth={1.5} />
            <div className="font-display font-semibold">Voice</div>
            <div className="text-xs text-zinc-500 mt-1">Speak naturally · Web Speech API</div>
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="text-sm text-zinc-400 flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#00FF94]" /> Powered by Gemini 3 Flash
        </div>
        <Button
          onClick={start}
          disabled={loading}
          size="lg"
          className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold h-12 px-6"
          data-testid="start-interview-btn"
        >
          {loading ? "Preparing..." : (<><PlayCircle className="w-4 h-4 mr-2" /> Start interview</>)}
        </Button>
      </div>
    </motion.div>
  );
}
