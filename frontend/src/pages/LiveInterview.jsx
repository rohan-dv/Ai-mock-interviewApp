import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { Mic, MicOff, Send, X, Clock, Brain, AudioLines, MessageSquare } from "lucide-react";

const BG_IMG = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1920&q=80&auto=format&fit=crop";

function useTypewriter(text, speed = 18) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return out;
}

export default function LiveInterview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false); // user intent — keeps mic alive across auto-restarts
  const startTime = useRef(Date.now());

  const fetchSession = () => {
    api.get(`/interviews/${sessionId}`)
      .then((r) => {
        setSession(r.data);
        if (r.data.status === "completed") {
          navigate(`/feedback/${r.data.id}`);
        }
      })
      .catch(() => {
        toast.error("Interview not found");
        navigate("/dashboard");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSession(); /* eslint-disable-next-line */ }, [sessionId]);

  useEffect(() => {
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  // Setup Web Speech API
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      if (final) {
        setAnswer((prev) => (prev ? prev + " " : "") + final.trim());
        setTranscript("");
      } else {
        setTranscript(interim);
      }
    };

    r.onend = () => {
      // Auto-restart if user still wants to listen (browsers stop after ~30-60s silence)
      if (shouldListenRef.current) {
        try { r.start(); return; } catch {}
      }
      setListening(false);
      setTranscript("");
    };

    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Microphone blocked. Allow mic access in your browser settings.");
        shouldListenRef.current = false;
        setListening(false);
        return;
      }
      if (e.error === "no-speech" || e.error === "aborted") {
        // Benign — onend will auto-restart if needed
        return;
      }
      if (e.error === "audio-capture") {
        toast.error("No microphone found.");
        shouldListenRef.current = false;
        setListening(false);
        return;
      }
      // Network or other transient — let onend restart
    };

    recognitionRef.current = r;
    return () => {
      shouldListenRef.current = false;
      try { r.abort(); } catch {}
    };
  }, []);

  const toggleMic = async () => {
    const r = recognitionRef.current;
    if (!r) {
      toast.error("Speech recognition isn't supported here. Use Chrome or Edge on desktop.");
      return;
    }
    if (listening) {
      shouldListenRef.current = false;
      try { r.stop(); } catch {}
      setListening(false);
      setTranscript("");
      return;
    }
    // Proactively request mic permission so user sees the prompt clearly
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      toast.error("Microphone permission denied.");
      return;
    }
    shouldListenRef.current = true;
    setTranscript("");
    try {
      r.start();
      setListening(true);
    } catch {
      // Already started — force a restart
      try { r.stop(); } catch {}
      setTimeout(() => {
        try { r.start(); setListening(true); } catch {}
      }, 200);
    }
  };

  const submit = async () => {
    if (!answer.trim()) {
      toast.error("Please provide an answer");
      return;
    }
    if (recognitionRef.current && listening) {
      shouldListenRef.current = false;
      try { recognitionRef.current.stop(); } catch {}
      setListening(false);
      setTranscript("");
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/interviews/${sessionId}/answer`, { answer });
      setAnswer("");
      setTranscript("");
      setSession(res.data);
      if (res.data.status === "completed") {
        toast.success("Interview complete · Generating feedback...");
        setTimeout(() => navigate(`/feedback/${res.data.id}`), 800);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const exit = () => {
    if (window.confirm("Exit the interview? Your progress will be saved.")) navigate("/dashboard");
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] animate-pulse">Preparing interview...</div>
      </div>
    );
  }

  const current = session.questions[session.current_index];
  const progress = ((session.current_index) / session.config.total_questions) * 100;
  const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const sec = String(elapsed % 60).padStart(2, "0");
  const isVoice = session.config.mode === "voice";

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-25" style={{ backgroundImage: `url(${BG_IMG})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050505]/70 via-[#050505]/85 to-[#050505]" />

      {/* Top bar */}
      <div className="border-b border-white/10 glass-strong">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-md bg-[#00FF94] flex items-center justify-center neon-ring">
              <Brain className="w-4 h-4 text-black" strokeWidth={2} />
            </div>
            <div>
              <div className="font-display font-semibold">{session.config.interview_type} · {session.config.difficulty}</div>
              <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
                Question {session.current_index + 1} / {session.config.total_questions}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono text-sm text-zinc-300">
              <Clock className="w-4 h-4 text-[#00FF94]" />
              {min}:{sec}
            </div>
            <Button variant="ghost" size="sm" onClick={exit} className="text-zinc-400 hover:text-white hover:bg-white/5" data-testid="exit-interview-btn">
              <X className="w-4 h-4 mr-1" /> Exit
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-0.5 bg-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* AI Question Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={session.current_index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="glass-strong rounded-lg p-8 relative"
          >
            <div className="flex items-start gap-4 mb-2">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center neon-ring">
                  <AudioLines className="w-5 h-5 text-[#00FF94]" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex-1">
                <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">ARIA · Interviewer</div>
                <QuestionText text={current?.question || ""} />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Answer panel */}
        <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-zinc-400">
              <MessageSquare className="w-4 h-4" strokeWidth={1.5} /> Your answer
            </div>
            {isVoice && (
              <button
                onClick={toggleMic}
                data-testid="voice-toggle-btn"
                className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  listening ? "bg-[#00FF94]/10 border-[#00FF94] text-[#00FF94] pulse-ring" : "border-white/15 text-zinc-300 hover:bg-white/5"
                }`}
              >
                {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                {listening ? "Listening..." : "Start mic"}
              </button>
            )}
          </div>

          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={isVoice ? "Speak or type your answer..." : "Type your answer..."}
            rows={8}
            className="bg-black/40 border-white/10 focus:border-[#00FF94] resize-none font-body"
            disabled={submitting}
            data-testid="answer-textarea"
          />

          {isVoice && transcript && (
            <div className="mt-3 text-sm text-zinc-500 italic">
              <span className="font-mono text-[10px] tracking-widest uppercase text-[#00FF94] mr-2">live</span>
              {transcript}
            </div>
          )}

          <div className="flex items-center justify-between mt-5">
            <div className="text-xs text-zinc-500 font-mono">{answer.length} chars</div>
            <Button
              onClick={submit}
              disabled={submitting || !answer.trim()}
              className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold"
              data-testid="submit-answer-btn"
            >
              {submitting ? "Sending..." : session.current_index + 1 === session.config.total_questions ? "Finish interview" : "Next question"}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="text-xs text-zinc-500 text-center font-mono tracking-widest uppercase">
          tip · think out loud · be structured · stay concise
        </div>
      </div>
    </div>
  );
}

function QuestionText({ text }) {
  const out = useTypewriter(text, 12);
  const done = out.length >= text.length;
  return (
    <p className="text-xl sm:text-2xl font-display font-medium leading-relaxed text-white">
      {out}
      {!done && <span className="caret" />}
    </p>
  );
}
