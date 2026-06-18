import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { ArrowRight, Mic, Brain, BarChart3, FileText, Sparkles, Zap, CheckCircle2 } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&q=80&auto=format&fit=crop";

const features = [
  { icon: Brain, title: "Adaptive AI Interviewer", desc: "Powered by Gemini 3 Flash. Asks contextual, follow-up questions like a senior interviewer." },
  { icon: Mic, title: "Voice & Text Mode", desc: "Speak your answers with browser-native speech recognition, or type — your call." },
  { icon: FileText, title: "Resume-Aware", desc: "Upload your resume. AI tailors every question to your projects, stack, and experience." },
  { icon: BarChart3, title: "Deep Analytics", desc: "Track score trends, topic mastery, weak areas — across every session you run." },
  { icon: Sparkles, title: "Personal Study Plan", desc: "Get a 4-week roadmap after each interview, mapped to your actual gaps." },
  { icon: Zap, title: "7 Interview Tracks", desc: "HR, DSA, System Design, Backend, Frontend, AI/ML, Behavioral — at 3 difficulty levels." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass-strong border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
            <div className="w-8 h-8 rounded-md bg-[#00FF94] flex items-center justify-center neon-ring">
              <span className="font-display font-black text-black text-sm">A</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-white text-sm">ARIA</span>
              <span className="font-mono text-[10px] tracking-widest text-[#00FF94] uppercase">interview.ai</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-white/5" data-testid="nav-login-btn">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold" data-testid="nav-signup-btn">
                Get started <ArrowRight className="ml-1.5 w-4 h-4" strokeWidth={2} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage: `url(${HERO_IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050505]/60 via-[#050505]/85 to-[#050505]" />
        <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade opacity-50" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] mb-6 mt-8">
              Interview like<br />
              the <span className="text-[#00FF94]">real thing.</span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mb-10 leading-relaxed">
              ARIA is an AI interviewer that adapts to your resume, asks follow-ups, evaluates you on technical depth, communication, and confidence — then builds a study plan that closes your gaps.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold h-12 px-6" data-testid="hero-cta-primary">
                  Start free interview <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-6 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" data-testid="hero-cta-secondary">
                  I have an account
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-zinc-400">
              {["No credit card", "Voice + text mode", "Resume-aware", "Detailed feedback"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00FF94]" strokeWidth={1.5} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 border-t border-white/5">
        <div className="max-w-2xl mb-16">
          <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-3">// what's inside</div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Everything you need to crack the next round.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
          {features.map((f, idx) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="bg-[#0F1115] p-8 hover:bg-[#13161c] transition-colors"
              data-testid={`feature-card-${idx}`}
            >
              <f.icon className="w-7 h-7 text-[#00FF94] mb-5" strokeWidth={1.5} />
              <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 border-t border-white/5">
        <div className="glass-strong rounded-lg p-12 md:p-16 text-center">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Your next interview starts <span className="text-[#00FF94]">now</span>.
          </h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">Sign up free and run your first mock interview in under 60 seconds.</p>
          <Link to="/signup">
            <Button size="lg" className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold h-12 px-8" data-testid="footer-cta">
              Get started — it's free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-zinc-500">
          <span className="font-mono tracking-widest uppercase">© 2026 ARIA · Interview.ai</span>
          <span className="font-mono tracking-widest uppercase">Built for engineers</span>
        </div>
      </footer>
    </div>
  );
}
