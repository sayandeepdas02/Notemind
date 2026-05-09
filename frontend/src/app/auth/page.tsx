"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginEmail = email || "demo@notemind.ai";
    const name = loginEmail.split("@")[0];

    try {
      const res = await fetch("http://localhost:8080/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          name: name,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem("notemind_token", data.token);
      localStorage.setItem("notemind_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      alert("Login failed. Check console.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6 relative">
      <Link href="/" className="absolute top-8 left-8 text-[#8b8b9f] hover:text-[#f8f8fa] flex items-center gap-2 font-medium transition-colors">
        <ArrowLeft size={18} /> Back to Home
      </Link>
      
      <div className="w-full max-w-md bg-[#121218] border border-[#222230] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#6366f1] opacity-[0.15] blur-3xl rounded-full" />
        
        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-[#6366f1] text-white flex items-center justify-center text-xl font-bold mb-4 shadow-lg shadow-[#6366f1]/20">
            ◈
          </div>
          <h1 className="text-2xl font-bold text-[#f8f8fa]">Welcome to Notemind</h1>
          <p className="text-[#8b8b9f] text-sm mt-2">Sign in to continue to your dashboard.</p>
        </div>

        <div className="space-y-4 relative z-10">
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-[#050508] hover:bg-gray-100 font-semibold py-3 px-4 rounded-xl transition-colors border border-transparent"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-[#222230]"></div>
            <span className="flex-shrink-0 mx-4 text-[#8b8b9f] text-xs uppercase font-medium tracking-wider">or</span>
            <div className="flex-grow border-t border-[#222230]"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com" 
                className="w-full bg-[#0a0a0f] border border-[#222230] text-[#f8f8fa] placeholder-[#8b8b9f] px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all"
                required 
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-[#222230] hover:bg-[#3b3b4f] text-[#f8f8fa] font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Continue with Email
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8b8b9f] mt-8 relative z-10">
          By continuing, you agree to our <a href="#" className="underline hover:text-[#f8f8fa]">Terms of Service</a> and <a href="#" className="underline hover:text-[#f8f8fa]">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
