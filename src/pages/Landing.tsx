import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, ArrowRight, Shield, Zap, Scale, ChevronRight, Globe, BookOpen, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const TRACKS = [
  { label: 'Property dispute', query: 'My uncle is occupying my fathers property without permission' },
  { label: 'Police issue', query: 'I received a threat and police refused to file my FIR' },
  { label: 'IPC 420 explain', query: 'IPC 420 explain' },
  { label: 'Article 21', query: 'Explain Article 21 of Indian Constitution' },
  { label: 'Unfair termination', query: 'My company fired me without notice pay' },
];

const FEATURES = [
  {
    icon: Scale,
    title: 'Case Analysis Engine',
    description: 'Guided step-by-step interview system that deeply understands your property, criminal, family, or employment dispute and generates a structured risk assessment.',
    accent: 'border-white/10',
  },
  {
    icon: BookOpen,
    title: 'IPC + Constitution Database',
    description: 'Instant, accurate explanations for any IPC section (1–511), fundamental rights, constitutional articles, and CrPC procedures — with punishment details.',
    accent: 'border-white/10',
  },
  {
    icon: Globe,
    title: 'Live Web Intelligence',
    description: 'Real-time legal references, landmark court judgments, and video guides fetched from the web to support every analysis with verified external sources.',
    accent: 'border-white/10',
  },
  {
    icon: Zap,
    title: 'Multi-Intent Detection',
    description: 'Understands complex mixed queries like "My brother took my land, what law applies?" — simultaneously shows the relevant IPC law AND starts a case analysis.',
    accent: 'border-white/10',
  },
];

const STATS = [
  { value: '511+', label: 'IPC Sections' },
  { value: '448', label: 'Constitution Articles' },
  { value: '4', label: 'Case Types' },
  { value: '0', label: 'Failed Responses' },
];

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleStart = (q?: string) => {
    const text = q || query;
    navigate('/auth', { state: { initialQuery: text } });
  };

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── SEO: Primary h1 (visually integrated into hero) ── */}

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#111] bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Gavel className="w-4 h-4 text-black" />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase">PickUp Law</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="interactive-button text-[10px] py-2.5 px-5"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-10">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] border border-white/10 px-5 py-2.5 rounded-full bg-white/[0.03] text-zinc-400"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
            Legal Intelligence System — Production v5.0
          </motion.div>

          {/* H1 — Primary SEO heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl md:text-[7.5rem] font-black tracking-tighter leading-[0.85] uppercase"
          >
            AI Legal
            <br />
            <span className="text-zinc-700">Assistant</span>
            <br />
            <span className="text-white">for India.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Analyze legal cases, understand IPC laws, and get structured legal guidance instantly.
            No jargon. No confusion. Just clear, actionable insight.
          </motion.p>

          {/* Hero Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto space-y-5"
          >
            <div className="relative group">
              <input
                type="text"
                id="hero-query"
                name="legal-query"
                placeholder="e.g. My uncle took my father's property... or IPC 420 explain"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                className="w-full bg-[#080808] border border-[#1F1F1F] focus:border-white/40 rounded-2xl px-6 py-5 text-base text-white placeholder:text-zinc-700 focus:outline-none transition-all shadow-[0_0_80px_rgba(0,0,0,0.8)] font-medium pr-14"
              />
              <button
                onClick={() => handleStart()}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-all active:scale-95"
              >
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Quick Tracks */}
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest self-center mr-1">Try:</span>
              {TRACKS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleStart(t.query)}
                  className="px-3.5 py-1.5 bg-[#080808] border border-[#1F1F1F] hover:border-zinc-600 hover:text-white rounded-full text-[10px] font-bold text-zinc-500 transition-all uppercase tracking-widest"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-4 gap-4 max-w-2xl mx-auto"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center space-y-1">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 border-t border-[#111]">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-black uppercase tracking-[0.15em] text-white">What It Does</h2>
            <p className="text-zinc-500 font-medium max-w-lg mx-auto">
              A complete legal intelligence system built for Indian law professionals, students, and citizens.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`p-8 border bg-[#050505] rounded-2xl space-y-4 hover:border-zinc-700 transition-all group ${f.accent}`}
              >
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed font-medium">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 border-t border-[#111]">
        <div className="max-w-4xl mx-auto space-y-16">
          <h2 className="text-3xl font-black uppercase tracking-[0.15em] text-center">How It Works</h2>
          <div className="space-y-6">
            {[
              { n: '01', title: 'Describe Your Situation', desc: 'Type in plain English — a personal dispute, an IPC question, or an article reference. The AI detects intent automatically.' },
              { n: '02', title: 'Guided Intelligence', desc: 'For cases: a structured Q&A interview. For knowledge: instant structured output with explanation, punishment, and key points.' },
              { n: '03', title: 'Actionable Report', desc: 'Get a comprehensive legal report with risk score, reasoning, actions, web insights, video guides, and critical warnings.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-6 items-start p-6 border border-[#111] rounded-2xl hover:border-zinc-800 transition-colors bg-[#030303]">
                <span className="text-4xl font-black text-zinc-800 shrink-0 w-12">{step.n}</span>
                <div className="space-y-1">
                  <h3 className="font-black uppercase tracking-tight text-white">{step.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-[#111] text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl font-black uppercase tracking-tighter">Start Now. Free.</h2>
          <p className="text-zinc-500 font-medium">No subscription. No credit card. Instant access.</p>
          <button
            onClick={() => navigate('/auth')}
            className="interactive-button inline-flex items-center gap-2 text-sm py-4 px-8"
          >
            Open PickUp Law <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-[#111] px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <Gavel className="w-3 h-3 text-black" />
            </div>
            <span className="font-black text-sm tracking-tighter uppercase text-zinc-400">PickUp Law Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-zinc-700" />
            <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.3em]">
              For Reference Only • Not Legal Advice • © 2026 PickUp AI Studio
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
