"use client";

import Link from "next/link";
import { ArrowRight, Video, Zap, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-surface-2/80 backdrop-blur-md border-b border-border z-50 flex items-center px-6 lg:px-12 justify-between">
        <div className="flex items-center gap-2 text-foreground font-bold text-xl tracking-tight">
          <div className="w-6 h-6 rounded bg-accent text-white flex items-center justify-center text-[10px]">◈</div>
          Notemind
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
          <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            Sign In
          </Link>
          <Link href="/auth" className="text-sm font-semibold bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-80 transition-opacity">
            Get Started
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-40 pb-20 px-6 lg:px-12 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-accent opacity-[0.15] blur-[100px] pointer-events-none rounded-full" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto text-center relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-semibold text-muted-foreground mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Notemind AI is now live
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-foreground">
              Your meetings, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#a855f7]">understood instantly.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Notemind joins your calls, transcribes in real-time, and generates structured summaries, decisions, and action items the second your meeting ends.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-accent/25 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background">
                Start Notemind for Free <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>

          {/* Product Preview Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="mt-20 max-w-5xl mx-auto relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-accent to-[#a855f7] rounded-2xl opacity-20 group-hover:opacity-30 blur-lg transition duration-1000" />
            <div className="relative rounded-2xl border border-border bg-background shadow-2xl overflow-hidden aspect-[16/9] flex flex-col">
              {/* Fake UI Header */}
              <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-surface-2 shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="mx-auto bg-background border border-border rounded-md px-12 md:px-24 py-1 text-xs text-muted-foreground flex items-center gap-2">
                  <Video size={12} /> app.notemind.com
                </div>
              </div>
              {/* Fake UI Content */}
              <div className="flex-1 flex p-4 gap-4 bg-background">
                <div className="flex-1 bg-surface-2 border border-border rounded-xl p-4 opacity-80 relative overflow-hidden flex flex-col gap-3">
                   <div className="w-3/4 h-3 bg-border rounded" />
                   <div className="w-1/2 h-3 bg-border rounded" />
                   <div className="w-full h-3 bg-border rounded mt-4" />
                   <div className="w-5/6 h-3 bg-border rounded" />
                   <div className="w-4/6 h-3 bg-border rounded" />
                   {/* Blur overlay for gradient effect */}
                   <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-surface-2 to-transparent" />
                </div>
                <div className="w-1/3 bg-surface-2 border border-border rounded-xl p-4 opacity-80 flex flex-col gap-4">
                  <div className="w-1/3 h-4 bg-accent/50 rounded mb-2" />
                  <div className="w-full h-16 border border-border rounded-lg" />
                  <div className="w-full h-16 border border-border rounded-lg" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-6 lg:px-12 bg-surface-2 border-y border-border">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Everything you need to run better meetings</h2>
              <p className="text-muted-foreground">Stop taking notes. Let AI handle the documentation.</p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Real-time Transcription", desc: "Watch the conversation turn into text instantly as Notemind listens via its headless bot." },
                { icon: FileText, title: "Structured Summaries", desc: "Our multi-stage pipeline turns messy transcripts into clean, executive-level summaries." },
                { icon: CheckCircle2, title: "Action Items & Decisions", desc: "Automatically extract what needs to be done, who is doing it, and what was decided." }
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="p-6 rounded-2xl bg-background border border-border hover:border-accent/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-6">
                      <Icon className="text-accent" size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">{f.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing (Simple) */}
        <section id="pricing" className="py-24 px-6 lg:px-12 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Simple, transparent pricing</h2>
            <p className="text-muted-foreground mb-12">Start for free. Upgrade when you need more.</p>

            <div className="bg-surface-2 border border-border rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden hover:border-accent/30 transition-colors">
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent opacity-[0.1] blur-2xl rounded-full" />
               <h3 className="text-2xl font-bold mb-2 text-foreground">Pro Plan</h3>
               <div className="flex items-baseline justify-center gap-2 mb-8">
                 <span className="text-5xl font-extrabold text-foreground">$15</span>
                 <span className="text-muted-foreground font-medium">/month</span>
               </div>
               
               <ul className="space-y-4 text-left max-w-sm mx-auto mb-10">
                 {["Unlimited meeting transcriptions", "Multi-stage AI summaries", "Export and public sharing", "Priority bot queuing"].map((f, i) => (
                   <li key={i} className="flex items-center gap-3">
                     <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                     <span className="text-foreground/80 font-medium">{f}</span>
                   </li>
                 ))}
               </ul>

               <Link href="/auth" className="block w-full bg-foreground text-background font-bold py-4 rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background">
                 Get Started Now
               </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-[#222230] py-12 px-6 lg:px-12 bg-[#0a0a0f] text-center">
        <div className="flex items-center justify-center gap-2 text-[#f8f8fa] font-bold text-lg mb-4">
          <div className="w-5 h-5 rounded bg-[#6366f1] text-white flex items-center justify-center text-[8px]">◈</div>
          Notemind
        </div>
        <p className="text-sm text-[#8b8b9f]">© {new Date().getFullYear()} Notemind AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
