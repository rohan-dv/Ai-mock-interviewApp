import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30" />

      <Link to="/" className="absolute top-6 left-6 text-zinc-400 hover:text-white flex items-center gap-1.5 text-sm" data-testid="back-home-link">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-md bg-[#00FF94] flex items-center justify-center neon-ring">
              <span className="font-display font-black text-black">A</span>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
          <p className="text-sm text-zinc-400">Log in to continue your interview prep</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-lg p-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="bg-transparent border-white/10 focus:border-[#00FF94] h-11"
              data-testid="login-email-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="bg-transparent border-white/10 focus:border-[#00FF94] h-11"
              data-testid="login-password-input"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold"
            data-testid="login-submit-btn"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-6">
          New here?{" "}
          <Link to="/signup" className="text-[#00FF94] hover:underline font-medium" data-testid="goto-signup-link">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
