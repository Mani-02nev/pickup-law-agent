import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Scale, Target, ListChecks,
  BookOpen, Gavel, Brain, ChevronRight, Globe, Youtube,
  ExternalLink, TrendingUp, Zap, CheckCircle2
} from 'lucide-react';
import { clsx } from 'clsx';
import { LegalReport } from '../../logic/types';

interface ChatMessageProps {
  role: 'user' | 'agent';
  content: string | LegalReport;
  isLast?: boolean;
  onContinue?: () => void;
}

// ─── Agent Status Indicator ──────────────────────────────────────────────────
export const AgentStatus: React.FC<{ thinking?: boolean }> = ({ thinking }) => (
  <div className={clsx('status-live flex items-center gap-2', thinking && 'status-thinking')}>
    <span className="dot" />
    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
      {thinking ? 'Thinking...' : 'Agent Active'}
    </span>
  </div>
);

// ─── Typing Indicator ─────────────────────────────────────────────────────────
export const TypingIndicator: React.FC = () => (
  <div className="flex w-full justify-start mb-6 gap-4">
    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-[#1F1F1F] flex items-center justify-center shrink-0">
      <Shield className="w-4 h-4 text-white" />
    </div>
    <div className="flex items-center gap-1.5 py-3 px-4 bg-[#080808] border border-[#1F1F1F] rounded-2xl">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </div>
);

// ─── Knowledge Card ───────────────────────────────────────────────────────────
const KnowledgeCard: React.FC<{ knowledge: NonNullable<LegalReport['knowledge']>; report: LegalReport }> = ({ knowledge, report }) => {
  const isIPC = knowledge.category.toLowerCase().includes('ipc') || knowledge.category.toLowerCase().includes('criminal law');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-3 w-full"
    >
      {/* Header */}
      <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 to-black space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={clsx('text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full', isIPC ? 'bg-white text-black' : 'bg-zinc-900 text-white border border-zinc-700')}>
            {isIPC ? '⚖️ IPC Engine' : '🏛️ Constitution Engine'}
          </span>
          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">Knowledge Mode</span>
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white leading-tight">
          {knowledge.title}
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{knowledge.summary}</p>
      </div>

      {/* Grid: Explanation + Punishment */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />📖 Explanation
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed">{knowledge.explanation}</p>
        </div>
        <div className="p-5 rounded-2xl border border-red-900/30 bg-red-950/10 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest">
            <AlertTriangle className="w-3.5 h-3.5" />⚖️ Punishment
          </div>
          <p className="text-sm text-red-300 font-semibold leading-relaxed">{knowledge.punishment}</p>
        </div>
      </div>

      {/* Simple Words */}
      <div className="p-5 rounded-2xl border border-yellow-900/30 bg-yellow-950/10 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-yellow-600 uppercase tracking-widest">
          <Brain className="w-3.5 h-3.5" />🧠 In Simple Words
        </div>
        <p className="text-sm text-yellow-200/90 leading-relaxed">{knowledge.simpleExplanation}</p>
      </div>

      {/* Key Points */}
      <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          <ListChecks className="w-3.5 h-3.5 text-green-500" />📊 Key Points
        </div>
        <ul className="space-y-2">
          {knowledge.keyPoints.map((pt, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-white">
              <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Web Insights (if any) */}
      {report.insights && report.insights.length > 0 && (
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <Globe className="w-3.5 h-3.5 text-blue-400" />🌐 Web Insights
          </div>
          {report.insights.map((ins, i) => (
            <div key={i} className="space-y-1 p-3 rounded-xl border border-[#111] hover:border-zinc-700 transition-colors">
              <a href={ins.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-zinc-300 transition-colors">
                {ins.title} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{ins.snippet}</p>
              <span className="text-[9px] text-zinc-700 font-black uppercase">{ins.source}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-2 border-t border-[#111]">
        <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-[0.2em]">
          PickUp Law Agent • Legal Intelligence Engine v3.0 • For reference only
        </p>
      </div>
    </motion.div>
  );
};

// ─── Risk Badge ───────────────────────────────────────────────────────────────
const RiskBadge: React.FC<{ level: 'Low' | 'Medium' | 'High'; score: number }> = ({ level, score }) => {
  const config = {
    High:   { bg: 'bg-red-600', text: 'text-white', border: 'border-red-600', circle: 'text-red-500', emoji: '🔴' },
    Medium: { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-500', circle: 'text-yellow-500', emoji: '🟡' },
    Low:    { bg: 'bg-green-500', text: 'text-black', border: 'border-green-500', circle: 'text-green-500', emoji: '🟢' },
  }[level];

  return (
    <div className="flex items-center gap-3">
      <span className={clsx('text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest', config.bg, config.text, config.border)}>
        {config.emoji} {level} Risk
      </span>
      <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Score: {score}/100</span>
    </div>
  );
};

// ─── Case Report Card ─────────────────────────────────────────────────────────
const CaseReportCard: React.FC<{ result: LegalReport; onContinue?: () => void }> = ({ result, onContinue }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 w-full">

    {/* Header */}
    <div className={clsx('p-6 rounded-2xl border-2 space-y-4', result.riskLevel === 'High' ? 'border-red-600/50 bg-red-950/10' : result.riskLevel === 'Medium' ? 'border-yellow-500/30 bg-yellow-950/5' : 'border-[#1a1a1a] bg-[#050505]')}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <RiskBadge level={result.riskLevel} score={result.riskScore} />
        <span className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.2em]">Case Analysis</span>
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase tracking-tighter">{result.legalArea}</h3>
        <div className="section-divider" />
        <div>
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">📌 Summary</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
        </div>
      </div>
    </div>

    {/* Legal Reasoning */}
    {result.reasoning.length > 0 && (
      <div className="high-contrast-card space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          <Scale className="w-3.5 h-3.5" />⚖️ Legal Explanation
        </div>
        <ul className="space-y-2">
          {result.reasoning.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm text-white leading-relaxed">
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />{r}
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Risk Factors */}
    {result.riskFactors.length > 0 && (
      <div className="high-contrast-card space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          <Target className="w-3.5 h-3.5" />📊 Risk Factors
        </div>
        <div className="flex flex-wrap gap-2">
          {result.riskFactors.map((r, i) => (
            <span key={i} className="px-3 py-1.5 bg-red-600/10 text-red-400 border border-red-600/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
              • {r}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Web Insights */}
    {result.insights && result.insights.length > 0 && (
      <div className="high-contrast-card space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          <Globe className="w-3.5 h-3.5 text-blue-500" />🌐 Web Insights
        </div>
        {result.insights.map((ins, i) => (
          <div key={i} className="p-4 rounded-xl border border-[#111] hover:border-zinc-700 transition-colors space-y-1">
            <a href={ins.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-white hover:text-zinc-300">
              {ins.title} <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <p className="text-xs text-zinc-500 leading-relaxed">{ins.snippet}</p>
            <span className="text-[9px] text-zinc-700 font-black uppercase">{ins.source}</span>
          </div>
        ))}
      </div>
    )}

    {/* Videos */}
    {result.videos && result.videos.length > 0 && (
      <div className="high-contrast-card space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          <Youtube className="w-3.5 h-3.5 text-red-500" />🎥 Video Guides
        </div>
        {result.videos.filter(v => v.videoId && v.videoId !== 'dQw4w9WgXcQ').map((vid, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-[#111]">
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${vid.videoId}?rel=0`}
                title={vid.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-3 border-t border-[#111]">
              <p className="text-xs font-bold text-white">{vid.title}</p>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Actions */}
    {result.actions.length > 0 && result.actions[0] !== 'No immediate action required for knowledge query.' && (
      <div className="high-contrast-card space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          <ListChecks className="w-3.5 h-3.5 text-green-500" />✅ Recommended Actions
        </div>
        <div className="space-y-2">
          {result.actions.map((a, i) => (
            <div key={i} className="flex items-start gap-4 p-4 border border-[#111] rounded-xl hover:border-zinc-700 transition-all group">
              <span className="text-xl font-black text-zinc-800 group-hover:text-white transition-colors shrink-0">{i + 1}</span>
              <p className="text-sm text-white font-medium leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Warnings */}
    {result.warnings.length > 0 && (
      <div className="p-5 border border-red-600/20 bg-red-600/[0.03] rounded-2xl flex gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">⚠️ Critical Warnings</p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-red-400 font-medium">• {w}</p>
          ))}
        </div>
      </div>
    )}

    {/* Continuous Conversation Prompt */}
    {onContinue && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-4 flex-wrap"
      >
        <p className="text-sm font-semibold text-zinc-300">
          Do you want to explore this further or analyze another case?
        </p>
        <div className="flex gap-2">
          <button onClick={onContinue} className="ghost-button text-[10px]">
            <Zap className="w-3.5 h-3.5 inline mr-1" /> Continue
          </button>
        </div>
      </motion.div>
    )}

    {/* Footer */}
    <div className="text-center py-3 border-t border-[#111]">
      <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-[0.2em]">
        PickUp Law Agent • Rule-Based Intelligence v5.0 • Not a substitute for legal counsel
      </p>
    </div>
  </motion.div>
);

// ─── Main ChatMessage ─────────────────────────────────────────────────────────
export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isLast, onContinue }) => {
  const isAgent = role === 'agent';

  if (!isAgent) {
    return (
      <div className="flex w-full justify-end mb-5">
        <div className="max-w-[82%] bg-white text-black px-5 py-3 rounded-2xl rounded-br-lg font-semibold text-sm shadow-lg">
          {typeof content === 'string' ? content : 'Data Request'}
        </div>
      </div>
    );
  }

  const result = (typeof content === 'object' && content !== null && 'caseType' in content)
    ? content as LegalReport
    : null;

  return (
    <div className="flex w-full justify-start mb-6 gap-3">
      {/* Agent avatar */}
      <div className="w-8 h-8 rounded-full bg-zinc-950 border border-[#1F1F1F] flex items-center justify-center shrink-0 mt-0.5">
        <Shield className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        {!result ? (
          <div className="text-[15px] text-white leading-relaxed font-medium">
            {content as string}
          </div>
        ) : result.caseType === 'KNOWLEDGE' && result.knowledge ? (
          <KnowledgeCard knowledge={result.knowledge} report={result} />
        ) : (
          <CaseReportCard result={result} onContinue={isLast ? onContinue : undefined} />
        )}
      </div>
    </div>
  );
};
