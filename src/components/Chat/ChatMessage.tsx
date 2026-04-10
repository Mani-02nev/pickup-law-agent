import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, Scale, Target, ListChecks,
  BookOpen, Brain, ChevronRight, Globe, Youtube,
  ExternalLink, Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { LegalReport, UserRole, ThinkingState } from '../../logic/types';

interface ChatMessageProps {
  role: 'user' | 'agent';
  content: string | LegalReport;
  userRole?: UserRole;
  userName?: string;
  exploreMode?: boolean;
  isLast?: boolean;
  onContinue?: () => void;
}

// ─── role tone labels ────────────────────────────────────────────────────────
const ROLE_LABELS: Record<UserRole, string> = {
  Advocate:    'Strategic Assessment',
  Lawyer:      'Legal Analysis',
  Law_Student: 'Study Guide',
  Judge:       'Judicial Review',
};

// ─── Agent Status Bar (multi-state) ──────────────────────────────────────────
export const AgentStatusBar: React.FC<{ thinkingState: ThinkingState }> = ({ thinkingState }) => {
  const isIdle = thinkingState === 'idle';
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('w-2 h-2 rounded-full shrink-0',
        isIdle      ? 'bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.4)]' 
                    : 'bg-yellow-400 shadow-[0_0_8px_2px_rgba(250,204,21,0.5)]',
        !isIdle && 'animate-pulse'
      )} />
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
        {isIdle ? 'Agent Active' : thinkingState === 'thinking' ? 'Thinking...' : thinkingState === 'processing' ? 'Processing...' : 'Generating...'}
      </span>
    </div>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
export const TypingIndicator: React.FC<{ state?: ThinkingState }> = ({ state = 'thinking' }) => {
  const MESSAGES: Record<string, string> = {
    thinking:   'Analyzing your legal situation...',
    processing: 'Evaluating legal provisions and risk factors...',
    generating: 'Building your structured legal report...',
  };
  return (
    <div className="flex w-full justify-start mb-4 gap-3">
      <div className="w-7 h-7 rounded-full bg-zinc-950 border border-[#1a1a1a] flex items-center justify-center shrink-0">
        <Shield className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex flex-col gap-1.5 py-3 px-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl rounded-bl-sm">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <AnimatePresence mode="wait">
          <motion.span key={state}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] text-zinc-600 font-medium italic">
            {MESSAGES[state] || 'Working...'}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={clsx('space-y-2', className)}>
    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{title}</p>
    {children}
  </div>
);

// ─── Bullet list ──────────────────────────────────────────────────────────────
const BulletList: React.FC<{ items: string[]; color?: string }> = ({ items, color = 'text-white' }) => (
  <ul className="space-y-1.5">
    {items.map((item, i) => (
      <li key={i} className={clsx('flex items-start gap-2.5 text-sm leading-relaxed', color)}>
        <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// ─── Punishment block ─────────────────────────────────────────────────────────
const PunishmentBlock: React.FC<{ punishment: string }> = ({ punishment }) => {
  // Convert "7 years + fine" → bullet points
  const bullets = punishment
    .split(/[;•\n]/)
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(s => s.includes('+') ? s.split('+').map(p => p.trim()) : [s]);

  return (
    <div className="p-5 rounded-2xl border border-red-900/30 bg-red-950/10 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
        <AlertTriangle className="w-3.5 h-3.5" />⚖️ Punishment
      </div>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-red-300 font-medium leading-relaxed">
            <span className="text-red-600 mt-1 shrink-0">•</span>{b}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Knowledge Card ───────────────────────────────────────────────────────────
const KnowledgeCard: React.FC<{
  knowledge: NonNullable<LegalReport['knowledge']>;
  report: LegalReport;
  userRole?: UserRole;
  exploreMode?: boolean;
}> = ({ knowledge, report, userRole = 'Lawyer', exploreMode }) => {
  const toneLabel = ROLE_LABELS[userRole];
  const isIPC = knowledge.category.toLowerCase().includes('ipc') || knowledge.category.toLowerCase().includes('criminal');

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className="p-6 rounded-2xl border border-white/8 bg-[#050505] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={clsx('text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full',
              isIPC ? 'bg-white text-black' : 'bg-zinc-900 text-white border border-zinc-700')}>
              {isIPC ? '⚖️ IPC' : '🏛️ Constitution'}
            </span>
            <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">{toneLabel}</span>
          </div>
          <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">Knowledge Mode</span>
        </div>
        <h2 className="text-xl font-black uppercase tracking-tighter text-white">{knowledge.title}</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{knowledge.summary}</p>
      </div>

      {/* Explanation + Punishment side by side on md+ */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5" />📖 Explanation
          </div>
          {userRole === 'Law_Student' ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-200 leading-relaxed">{knowledge.simpleExplanation}</p>
              <p className="text-[11px] text-zinc-600 italic">💡 Think of it this way: {knowledge.simpleExplanation.split('.')[0]}.</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-200 leading-relaxed">{knowledge.explanation}</p>
          )}
        </div>
        <PunishmentBlock punishment={knowledge.punishment} />
      </div>

      {/* Simple Words */}
      {userRole !== 'Law_Student' && (
        <div className="p-5 rounded-2xl border border-yellow-900/25 bg-yellow-950/8 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-yellow-600 uppercase tracking-widest">
            <Brain className="w-3.5 h-3.5" />🧠 In Simple Words
          </div>
          <p className="text-sm text-yellow-200/90 leading-relaxed">{knowledge.simpleExplanation}</p>
        </div>
      )}

      {/* Key Points */}
      <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          <ListChecks className="w-3.5 h-3.5 text-green-500" />📊 Key Points
        </div>
        <BulletList items={knowledge.keyPoints} />
      </div>

      {/* Explore: Web Insights */}
      {exploreMode && report.insights && report.insights.length > 0 && (
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <Globe className="w-3.5 h-3.5 text-blue-400" />🌐 Web Insights
          </div>
          {report.insights.map((ins, i) => (
            <div key={i} className="space-y-1 p-3 rounded-xl border border-[#111] hover:border-zinc-700 transition-colors">
              <a href={ins.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-zinc-300">
                {ins.title} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{ins.snippet}</p>
              <span className="text-[9px] text-zinc-700 font-black uppercase">{ins.source}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-center pt-1 border-t border-[#111]">
        <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-widest">
          PickUp Law Agent · Knowledge Engine v3.0 · For reference only
        </p>
      </div>
    </div>
  );
};

// ─── Risk Badge ───────────────────────────────────────────────────────────────
const RiskBadge: React.FC<{ level: 'Low' | 'Medium' | 'High'; score: number }> = ({ level, score }) => {
  const cfg = {
    High:   { bg: 'bg-red-600',    text: 'text-white',   border: 'border-red-600',    emoji: '🔴' },
    Medium: { bg: 'bg-yellow-500', text: 'text-black',   border: 'border-yellow-500', emoji: '🟡' },
    Low:    { bg: 'bg-green-500',  text: 'text-black',   border: 'border-green-500',  emoji: '🟢' },
  }[level];
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className={clsx('text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest', cfg.bg, cfg.text, cfg.border)}>
        {cfg.emoji} {level} Risk
      </span>
      <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Score: {score}/100</span>
    </div>
  );
};

// ─── Case Report Card ─────────────────────────────────────────────────────────
const CaseReportCard: React.FC<{
  result: LegalReport;
  userRole?: UserRole;
  userName?: string;
  exploreMode?: boolean;
  onContinue?: () => void;
  isLast?: boolean;
}> = ({ result, userRole = 'Lawyer', userName, exploreMode, onContinue, isLast }) => {
  const toneLabel = ROLE_LABELS[userRole];

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className={clsx('p-6 rounded-2xl border-2 space-y-4',
        result.riskLevel === 'High'   ? 'border-red-600/40 bg-red-950/8'
        : result.riskLevel === 'Medium' ? 'border-yellow-500/25 bg-yellow-950/5'
        : 'border-[#1a1a1a] bg-[#050505]')}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <RiskBadge level={result.riskLevel} score={result.riskScore} />
          <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">{toneLabel}</span>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-black uppercase tracking-tighter">{result.legalArea}</h3>
          <div className="border-t border-[#1a1a1a]" />
          <Section title="📌 Summary">
            <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
          </Section>
        </div>
      </div>

      {/* Legal Explanation */}
      {result.reasoning.length > 0 && (
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <Scale className="w-3.5 h-3.5" />⚖️ Legal Explanation
          </div>
          <BulletList items={result.reasoning} />
        </div>
      )}

      {/* Risk Factors */}
      {result.riskFactors.length > 0 && (
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
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

      {/* Explore: Web Insights */}
      {exploreMode && result.insights && result.insights.length > 0 && (
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <Globe className="w-3.5 h-3.5 text-blue-400" />🌐 Web Insights
          </div>
          {result.insights.map((ins, i) => (
            <div key={i} className="p-3 rounded-xl border border-[#111] hover:border-zinc-700 transition-colors space-y-1">
              <a href={ins.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-white hover:text-zinc-300">
                {ins.title} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{ins.snippet}</p>
              <span className="text-[9px] text-zinc-700 font-black uppercase">{ins.source}</span>
            </div>
          ))}
        </div>
      )}

      {/* Explore: Videos */}
      {exploreMode && result.videos && result.videos.filter(v => v.videoId && v.videoId !== 'dQw4w9WgXcQ').length > 0 && (
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <Youtube className="w-3.5 h-3.5 text-red-500" />🎥 Video Guides
          </div>
          {result.videos.filter(v => v.videoId && v.videoId !== 'dQw4w9WgXcQ').map((vid, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-[#111]">
              <div className="aspect-video">
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${vid.videoId}?rel=0`} title={vid.title} frameBorder="0" allowFullScreen />
              </div>
              <div className="p-3 border-t border-[#111]">
                <p className="text-xs font-bold">{vid.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {result.actions.length > 0 && result.actions[0] !== 'No immediate action required for knowledge query.' && (
        <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <ListChecks className="w-3.5 h-3.5 text-green-500" />✅ Recommended Actions
          </div>
          <ol className="space-y-2">
            {result.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-4 p-4 border border-[#111] rounded-xl hover:border-zinc-700 transition-all group">
                <span className="text-lg font-black text-zinc-800 group-hover:text-white transition-colors shrink-0">{i + 1}</span>
                <p className="text-sm text-white font-medium leading-relaxed">{a}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="p-5 border border-red-600/20 bg-red-600/[0.03] rounded-2xl flex gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">⚠️ Warnings</p>
            {result.warnings.map((w, i) => <p key={i} className="text-xs text-red-400 font-medium">• {w}</p>)}
          </div>
        </div>
      )}

      {/* Continue prompt */}
      {isLast && onContinue && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-zinc-400 font-medium flex-1">Do you want to explore this further or analyze another case?</p>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onContinue}
            className="flex items-center gap-2 px-4 py-2 border border-white/15 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:border-white/30 transition-all">
            <Zap className="w-3.5 h-3.5" /> Continue
          </motion.button>
        </motion.div>
      )}

      <div className="text-center pt-1 border-t border-[#111]">
        <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-widest">
          PickUp Law Agent · Case Engine v5.0 · Not a substitute for legal counsel
        </p>
      </div>
    </div>
  );
};
// ─── Invalid IPC Section Card ────────────────────────────────────────────────────
const QUICK_IPC = [
  { label: 'IPC 302', sub: 'Murder',          query: 'IPC 302 explain' },
  { label: 'IPC 420', sub: 'Cheating',         query: 'IPC 420 explain' },
  { label: 'IPC 379', sub: 'Theft',            query: 'IPC 379 explain' },
  { label: 'IPC 354', sub: 'Assault on Woman', query: 'IPC 354 explain' },
  { label: 'IPC 498A', sub: 'Cruelty to Wife', query: 'IPC 498A explain' },
];

const InvalidIPCCard: React.FC<{ result: LegalReport }> = ({ result }) => (
  <div className="space-y-4 w-full">
    {/* Error header */}
    <div className="p-5 rounded-2xl border border-yellow-600/30 bg-yellow-950/10 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Invalid IPC Section</span>
      </div>
      <h3 className="text-lg font-black text-white">{result.knowledge?.title}</h3>
      <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
    </div>

    {/* Explanation */}
    <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-2">
      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">📌 Why?</p>
      {result.reasoning.map((r, i) => (
        <p key={i} className="text-sm text-zinc-300 flex items-start gap-2">
          <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />{r}
        </p>
      ))}
    </div>

    {/* Quick IPC buttons */}
    <div className="p-5 rounded-2xl border border-[#1a1a1a] bg-[#050505] space-y-3">
      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
        🧠 Try these valid sections instead
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_IPC.map((s, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => {
              // Dispatch custom event to pre-fill input
              window.dispatchEvent(new CustomEvent('pl:quick-query', { detail: { query: s.query } }));
            }}
            className="flex flex-col items-start px-4 py-2.5 rounded-xl border border-[#1a1a1a] hover:border-white hover:bg-white hover:text-black transition-all group"
          >
            <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-black text-white">{s.label}</span>
            <span className="text-[9px] text-zinc-600 group-hover:text-black/60">{s.sub}</span>
          </motion.button>
        ))}
      </div>
    </div>

    {/* Warning */}
    {result.warnings.length > 0 && (
      <div className="flex gap-2 items-start p-4 rounded-2xl border border-yellow-900/20 bg-yellow-950/5">
        <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-400">{result.warnings[0]}</p>
      </div>
    )}
  </div>
);


export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, userRole, userName, exploreMode, isLast, onContinue }) => {
  const isAgent = role === 'agent';

  if (!isAgent) {
    return (
      <div className="flex w-full justify-end mb-4">
        <div className="max-w-[80%] bg-white text-black px-5 py-3 rounded-2xl rounded-br-md font-semibold text-sm shadow-lg leading-relaxed">
          {typeof content === 'string' ? content : 'Analysis Request'}
        </div>
      </div>
    );
  }

  const result = (typeof content === 'object' && content !== null && 'caseType' in content)
    ? content as LegalReport : null;

  return (
    <div className="flex w-full justify-start mb-4 gap-3">
      <div className="w-7 h-7 rounded-full bg-zinc-950 border border-[#1a1a1a] flex items-center justify-center shrink-0 mt-1">
        <Shield className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {!result ? (
          <div className="text-[15px] text-zinc-200 leading-relaxed font-medium">
            {content as string}
          </div>
        ) : result.caseType === 'IPC_INVALID' ? (
          <InvalidIPCCard result={result} />
        ) : result.caseType === 'KNOWLEDGE' && result.knowledge ? (
          <KnowledgeCard knowledge={result.knowledge} report={result} userRole={userRole} exploreMode={exploreMode} />
        ) : (
          <CaseReportCard result={result} userRole={userRole} userName={userName} exploreMode={exploreMode} isLast={isLast} onContinue={onContinue} />
        )}
      </div>
    </div>
  );
};
