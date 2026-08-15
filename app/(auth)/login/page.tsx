"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Shield, Zap, BarChart2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

function ValuePlusBrand({ dark = false, size = "large" }: { dark?: boolean; size?: "small" | "large" }) {
  return (
    <div className="flex flex-col items-start justify-center">
      <div className={`flex items-center ${size === "large" ? "text-3xl" : "text-xl"} font-black tracking-tight leading-none`}>
        <span className={dark ? "text-slate-900" : "text-white"}>VALUE</span>
        <span className="text-[#76C043]">PLUS</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1 opacity-90">
        <div className={`h-[1px] w-3 ${dark ? "bg-slate-400" : "bg-white/70"}`} />
        <span className={`${dark ? "text-slate-500" : "text-slate-200"} text-[10px] font-medium tracking-wide`}>रिश्ता विश्वास का</span>
        <div className={`h-[1px] w-3 ${dark ? "bg-slate-400" : "bg-white/70"}`} />
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: BarChart2, title: "Real-time Analytics", desc: "Live business insights at your fingertips" },
  { icon: Shield, title: "GST Compliant", desc: "Fully compliant with Indian tax regulations" },
  { icon: Zap, title: "Lightning Fast", desc: "Process invoices and orders in seconds" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: username,
        password: password,
      });

      if (res?.error) {
        setError("Login failed: " + res.error);
      } else if (res?.ok) {
        window.location.href = "/dashboard";
      } else {
        setError("Unknown error: " + JSON.stringify(res));
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#1a2744] flex-col relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#3F63AD]/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#76C043]/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#3F63AD]/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12 justify-between">
          {/* Top Branding */}
          <div className="flex items-center justify-between">
            <ValuePlusBrand size="large" />
            <a
              href="https://www.shineinfosolutions.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all group"
            >
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm">
                <img src="/bglogo.png" alt="Shine Infosolutions" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[8px] uppercase tracking-widest text-slate-300 font-semibold leading-none">Powered By</span>
                <span className="text-[11px] font-bold text-white group-hover:text-[#76C043] transition-colors leading-tight">Shine Infosolutions</span>
              </div>
            </a>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                India's Most Premium{" "}
                <span className="text-[#76C043]">ERP System</span>
              </h1>
              <p className="text-slate-300 text-lg mb-10 leading-relaxed">
                Manage your entire business from one powerful platform. Invoicing, inventory, accounting, and GST — all in one place.
              </p>

              {/* Feature list */}
              <div className="space-y-5">
                {FEATURES.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#3F63AD]/30 border border-[#3F63AD]/40 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-[#76C043]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{feature.title}</p>
                      <p className="text-slate-400 text-sm mt-0.5">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { value: "10K+", label: "Businesses" },
              { value: "₹500Cr+", label: "Processed" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-[#76C043]">{stat.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center mb-8">
            <ValuePlusBrand dark size="large" />
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-border shadow-xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1.5">Sign in to your ERP account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-[#3F63AD] hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v as boolean)}
                />
                <Label htmlFor="remember" className="font-normal cursor-pointer">
                  Remember me for 30 days
                </Label>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-700 text-[10px] font-bold">!</span>
                  </div>
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                size="lg"
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-[#F8FAFC] rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-3.5 h-3.5 text-[#3F63AD]" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demo Credentials</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Username</p>
                  <p className="font-mono font-semibold text-foreground">admin</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Password</p>
                  <p className="font-mono font-semibold text-foreground">123456</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setUsername("admin"); setPassword("123456"); }}
                className="mt-2 text-xs text-[#3F63AD] hover:underline font-medium"
              >
                Click to auto-fill →
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <a
              href="https://www.shineinfosolutions.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm transition-all text-slate-700 hover:border-[#3F63AD]/40 group"
            >
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100 p-0.5">
                <img src="/bglogo.png" alt="Shine Infosolutions" className="w-full h-full object-contain" />
              </div>
              <span className="text-xs font-medium text-slate-600">
                Powered by <span className="font-bold text-slate-900 group-hover:text-[#3F63AD] transition-colors">Shine Infosolutions</span>
              </span>
            </a>
            <p className="text-[11px] text-muted-foreground">
              © 2026 ValuePlus ERP · All rights reserved · <span className="text-[#3F63AD] font-medium">Made in India 🇮🇳</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
