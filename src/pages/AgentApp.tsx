import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel, Plus, LogOut, ChevronRight, Scale,
  Globe, Youtube, MessageSquare, History, Trash2, Clock
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../utils/supabase';
import { detectMode, AgentMode } from '../logic/modeDetector';
import { classifyIntent } from '../logic/classifier';
import { QUESTION_TREES } from '../logic/questionTree';
import { generateDecision } from '../logic/decisionEngine';
import { handleKnowledgeQuery, handleIPCQuery } from '../logic/knowledgeEngine';
import { fetchWebInsights, fetchYouTubeVideos } from '../utils/integrations';
import { LegalReport, ChatState, LegalCategory, UserRole } from '../logic/types';
import { ChatMessage, AgentStatus, TypingIndicator } from '../components/Chat/ChatMessage';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string | LegalReport;
  ts: number;
}

interface SessionRecord {
  id: string;
  label: string;
  mode: AgentMode | null;
  messages: Message[];
  createdAt: number;
}

const ROLES: UserRole[] = ['Advocate', 'Lawyer', 'Law_Student', 'Judge'];

const DEFAULT_CHAT_STATE = (role: UserRole): ChatState => ({
  step: 0,
  category: 'unknown',
  answers: {},
  riskScore: 0,
  isComplete: false,
  history: [],
  role,
});

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Main App ─────────────────────────────────────────────────────────────────
export const AgentApp: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Auth
  const [authSession, setAuthSession] = useState<any>(null);

  // Role
  const [role, setRole] = useState<UserRole>('Lawyer');

  // Chat
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [mode, setMode]             = useState<AgentMode | null>(null);
  const [chatState, setChatState]   = useState<ChatState>(DEFAULT_CHAT_STATE('Lawyer'));
  const [isTyping, setIsTyping]     = useState(false);

  // History
  const [history, setHistory]       = useState<SessionRecord[]>([]);
  const [sessionId, setSessionId]   = useState<string>(uid());

  // UI
  const [activeTab, setActiveTab]   = useState<'chat' | 'insights' | 'videos'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/auth');
      setAuthSession(session);
    });
  }, []);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // ── Restore initial query from landing page ─────────────────────────────────
  useEffect(() => {
    const initialQuery = (location.state as any)?.initialQuery;
    if (initialQuery) {
      addAgentGreeting();
      setTimeout(() => handleSend(initialQuery), 600);
    } else {
      addAgentGreeting();
    }
  }, []);

  // ── Load history from localStorage ─────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pl_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // ── Save current session to history ─────────────────────────────────────────
  useEffect(() => {
    if (messages.length < 2) return;
    const record: SessionRecord = {
      id: sessionId,
      label: (() => {
        const first = messages.find(m => m.role === 'user');
        if (!first) return 'Session';
        const text = typeof first.content === 'string' ? first.content : 'Legal Analysis';
        return text.slice(0, 48) + (text.length > 48 ? '…' : '');
      })(),
      mode,
      messages,
      createdAt: Date.now(),
    };
    setHistory(prev => {
      const updated = [record, ...prev.filter(h => h.id !== sessionId)].slice(0, 20);
      try { localStorage.setItem('pl_history', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, [messages]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const addMsg = useCallback((role: 'user' | 'agent', content: string | LegalReport) => {
    setMessages(prev => [...prev, { id: uid(), role, content, ts: Date.now() }]);
  }, []);

  function addAgentGreeting() {
    setMessages([{
      id: uid(),
      role: 'agent',
      content: 'PickUp Law Agent active. Ask about any IPC section, constitutional article, or describe your legal situation.',
      ts: Date.now(),
    }]);
  }

  function newSession() {
    const id = uid();
    setSessionId(id);
    setMode(null);
    setChatState(DEFAULT_CHAT_STATE(role));
    setInput('');
    setIsTyping(false);
    setActiveTab('chat');
    addAgentGreeting();
  }

  function loadSession(record: SessionRecord) {
    setSessionId(record.id);
    setMessages(record.messages);
    setMode(record.mode);
    setSidebarOpen(false);
  }

  function deleteSession(id: string) {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      try { localStorage.setItem('pl_history', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }

  // ─── HANDLE SEND ─────────────────────────────────────────────────────────────
  const handleSend = async (forcedInput?: string) => {
    const userText = forcedInput || input.trim();
    if (!userText || isTyping) return;

    setInput('');
    if (!forcedInput) addMsg('user', userText);
    setIsTyping(true);

    // ── If in mid-case question flow ──────────────────────────────────────────
    if (mode === 'case' && chatState.step > 0 && !chatState.isComplete) {
      await processAnswer(userText);
      return;
    }

    // ── Fresh mode detection ──────────────────────────────────────────────────
    const detectedMode = detectMode(userText);
    setMode(detectedMode);

    // ════════════════════════
    // ENGINE 1 — IPC ENGINE
    // ════════════════════════
    if (detectedMode === 'ipc') {
      const report = handleIPCQuery(userText);
      await delay(700);
      setIsTyping(false);
      addMsg('agent', report);
      return;
    }

    // ════════════════════════
    // ENGINE 2 — KNOWLEDGE
    // ════════════════════════
    if (detectedMode === 'knowledge') {
      const report = handleKnowledgeQuery(userText);
      // Enrich with live web insights
      const insights = await fetchWebInsights(userText).catch(() => []);
      if (insights.length > 0) report.insights = insights;
      await delay(700);
      setIsTyping(false);
      addMsg('agent', report);
      return;
    }

    // ════════════════════════
    // ENGINE 3 — CASE ENGINE
    // ════════════════════════
    if (detectedMode === 'case') {
      // Multi-intent: also show relevant law before asking questions
      const relevantLaw = handleIPCQuery(userText) || handleKnowledgeQuery(userText);
      const category    = classifyIntent(userText);
      const categoryLabel = category.replace('_case', '').replace('_', ' ').toUpperCase();

      // Set up case state
      setChatState({
        step: 1,
        category,
        answers: {},
        riskScore: 0,
        isComplete: false,
        history: [],
        role,
      });

      await delay(600);
      setIsTyping(false);

      // Multi-intent: show related law first
      if (relevantLaw?.knowledge) {
        addMsg('agent', relevantLaw);
      }

      // Then start case flow
      addMsg('agent', `Case Engine activated — analyzing your ${categoryLabel} situation.`);
      addMsg('agent', QUESTION_TREES[category][0].text);
      return;
    }
  };

  // ─── PROCESS CASE ANSWER ──────────────────────────────────────────────────
  const processAnswer = async (value: string, score: number = 0, nextStep?: string) => {
    const questions   = QUESTION_TREES[chatState.category];
    const node        = questions[chatState.step - 1];
    if (!node) { setIsTyping(false); return; }

    const newAnswers  = { ...chatState.answers, [node.field]: value };
    const newScore    = chatState.riskScore + score;

    const isEnd = nextStep === 'END' || (!nextStep && chatState.step >= questions.length);

    if (isEnd) {
      // Fetch live intelligence in parallel
      const [insights, videos] = await Promise.allSettled([
        fetchWebInsights(chatState.category.replace('_case', '')),
        fetchYouTubeVideos(chatState.category.replace('_case', ' legal India')),
      ]);

      const insightsData = insights.status === 'fulfilled' ? insights.value : [];
      const videosData   = videos.status === 'fulfilled'   ? videos.value   : [];

      const decision = generateDecision(chatState.category, newAnswers, newScore, role, insightsData, videosData);

      setChatState(prev => ({ ...prev, answers: newAnswers, riskScore: newScore, isComplete: true }));

      await delay(1000);
      setIsTyping(false);
      addMsg('agent', decision);
      return;
    }

    const nextIndex = nextStep
      ? questions.findIndex(q => q.id === nextStep)
      : chatState.step;

    setChatState(prev => ({ ...prev, answers: newAnswers, riskScore: newScore, step: nextIndex + 1 }));

    await delay(600);
    setIsTyping(false);
    addMsg('agent', questions[nextIndex].text);
  };

  const handleChoice = (opt: any) => {
    addMsg('user', opt.label);
    processAnswer(opt.value, opt.score || 0, opt.nextStep);
  };

  // ─── Latest report for tabs ────────────────────────────────────────────────
  const latestReport = [...messages].reverse()
    .find(m => typeof m.content === 'object' && (m.content as LegalReport)?.caseType)
    ?.content as LegalReport | undefined;

  // ─── Continuous conversation prompt handler ────────────────────────────────
  const handleContinue = () => {
    addMsg('agent', 'Of course. Feel free to ask about another IPC section, legal term, or describe a new situation.');
    inputRef.current?.focus();
  };

  // ─── Input disabled logic ──────────────────────────────────────────────────
  const hasOptions = mode === 'case' && chatState.step > 0 && !chatState.isComplete &&
    (QUESTION_TREES[chatState.category]?.[chatState.step - 1]?.options?.length || 0) > 0;

  const inputDisabled = isTyping || hasOptions;

  const inputPlaceholder = mode === 'case' && chatState.step > 0 && !chatState.isComplete
    ? 'Click an option above or type your answer...'
    : mode === 'ipc'
    ? 'Ask about another IPC section (e.g. section 498A)...'
    : 'Ask a legal question or describe your situation...';

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ════════════════════════════════════════════════
          SIDEBAR — Desktop History Panel
      ════════════════════════════════════════════════ */}
      <aside className={clsx(
        'flex flex-col border-r border-[#111] bg-[#030303] transition-all duration-300 z-40',
        'fixed inset-y-0 left-0 lg:relative',
        sidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0 lg:w-[260px]'
      )}>
        {/* Logo */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#111]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <Gavel className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-black text-sm tracking-tighter uppercase">PickUp Law</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-600 hover:text-white transition-colors p-1">✕</button>
        </div>

        {/* New Session */}
        <div className="p-4">
          <button onClick={newSession} className="w-full flex items-center justify-center gap-2 py-3 border border-[#1a1a1a] hover:border-zinc-700 text-zinc-500 hover:text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all">
            <Plus className="w-3.5 h-3.5" /> New Session
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
          {history.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <History className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
              <p className="text-[10px] text-zinc-700 font-black uppercase tracking-widest">No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-3 py-3">Session History</p>
              {history.map((h) => (
                <div key={h.id} className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[#0a0a0a] transition-colors cursor-pointer" onClick={() => loadSession(h)}>
                  <Clock className="w-3 h-3 text-zinc-700 shrink-0" />
                  <span className="flex-1 text-[11px] text-zinc-500 group-hover:text-white transition-colors truncate font-medium">{h.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(h.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-700 hover:text-red-500 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-[#111]">
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate('/auth'))}
            className="w-full flex items-center gap-2 py-2.5 px-4 rounded-xl text-zinc-600 hover:text-white hover:bg-[#0a0a0a] transition-all text-[11px] font-black uppercase tracking-widest"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ════════════════════════════════════════════════
          MAIN CHAT AREA
      ════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black border-r border-[#111]">

        {/* ── Header ── */}
        <header className="shrink-0 border-b border-[#111] bg-black z-20">
          <div className="flex items-center justify-between px-5 py-3">
            {/* Mobile menu + logo */}
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-[#111] transition-colors">
                <History className="w-5 h-5 text-zinc-500" />
              </button>
              <span className="font-black text-sm tracking-tighter uppercase text-zinc-400 hidden sm:block">PL Agent</span>
            </div>

            {/* Agent Status */}
            <AgentStatus thinking={isTyping} />

            {/* Role Selector */}
            <div className="flex items-center gap-1">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRole(r); setChatState(prev => ({ ...prev, role: r })); }}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                    role === r ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'
                  )}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="flex lg:hidden border-t border-[#111]">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'insights', label: 'Insights', icon: Globe },
              { id: 'videos', label: 'Video', icon: Youtube },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx('flex-1 py-3 flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-widest',
                  activeTab === tab.id ? 'tab-active' : 'tab-inactive')}
              >
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Chat Messages ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar relative pt-6 pb-36 px-5 md:px-10"
        >
          <div className="max-w-[760px] mx-auto w-full">
            {(activeTab === 'chat' || window.innerWidth >= 1024) && (
              <div className="space-y-2">
                {messages.map((m, i) => (
                  <ChatMessage
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    isLast={i === messages.length - 1}
                    onContinue={handleContinue}
                  />
                ))}

                {/* Typing indicator */}
                {isTyping && <TypingIndicator />}

                {/* Case choice buttons */}
                <AnimatePresence>
                  {!isTyping && mode === 'case' && chatState.step > 0 && !chatState.isComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-wrap gap-2 justify-start pl-11"
                    >
                      {(QUESTION_TREES[chatState.category]?.[chatState.step - 1]?.options || []).map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleChoice(opt)}
                          className="interactive-button text-[10px] py-2.5"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Mobile Insights Tab ── */}
            <div className="lg:hidden">
              {activeTab === 'insights' && (
                <div className="space-y-4 pt-4">
                  <h2 className="text-xl font-black uppercase">Web Insights</h2>
                  {(latestReport?.insights || []).map((ins, i) => (
                    <div key={i} className="high-contrast-card space-y-2">
                      <p className="text-[9px] font-black text-zinc-600 uppercase">{ins.source}</p>
                      <a href={ins.link} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-zinc-300 block">{ins.title}</a>
                      <p className="text-xs text-zinc-500 leading-relaxed">{ins.snippet}</p>
                    </div>
                  ))}
                  {!latestReport?.insights?.length && (
                    <p className="text-zinc-700 text-center py-20 text-[10px] font-black uppercase">Analyze a case to see insights</p>
                  )}
                </div>
              )}
              {activeTab === 'videos' && (
                <div className="space-y-4 pt-4">
                  <h2 className="text-xl font-black uppercase">Video Guides</h2>
                  {(latestReport?.videos || []).filter(v => v.videoId && v.videoId !== 'dQw4w9WgXcQ').map((vid, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-[#111]">
                      <iframe className="w-full aspect-video" src={`https://www.youtube.com/embed/${vid.videoId}?rel=0`} title={vid.title} frameBorder="0" allowFullScreen />
                      <div className="p-4"><p className="text-sm font-bold">{vid.title}</p></div>
                    </div>
                  ))}
                  {!latestReport?.videos?.filter(v => v.videoId !== 'dQw4w9WgXcQ')?.length && (
                    <p className="text-zinc-700 text-center py-20 text-[10px] font-black uppercase">Relevant videos will appear here</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sticky Input ── */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-5 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="max-w-[760px] mx-auto relative group">
            <input
              ref={inputRef}
              type="text"
              id="legal-input"
              className="chat-input pr-14"
              placeholder={inputPlaceholder}
              value={input}
              disabled={inputDisabled}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !inputDisabled && handleSend()}
            />
            <button
              onClick={() => handleSend()}
              disabled={inputDisabled || !input.trim()}
              className={clsx(
                'absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                input.trim() && !inputDisabled
                  ? 'bg-white text-black hover:bg-zinc-200 active:scale-95'
                  : 'bg-[#111] text-zinc-700 cursor-not-allowed'
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════════════════
          RIGHT PANEL — Desktop Insights + Videos
      ════════════════════════════════════════════════ */}
      <aside className="hidden xl:flex flex-col w-[320px] border-l border-[#111] bg-[#030303] overflow-hidden">
        <header className="p-6 border-b border-[#111] shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Live Intelligence Feed</p>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">

          {/* Web Insights */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-500" />Web Insights
            </h3>
            {(latestReport?.insights || []).map((ins, i) => (
              <div key={i} className="space-y-1.5 p-4 border border-[#111] rounded-xl hover:border-zinc-800 transition-colors">
                <p className="text-[9px] font-black text-zinc-700 uppercase">{ins.source}</p>
                <a href={ins.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white hover:text-zinc-300 leading-relaxed block">{ins.title}</a>
                <p className="text-[10px] text-zinc-600 leading-relaxed">{ins.snippet}</p>
              </div>
            ))}
            {!latestReport?.insights?.length && (
              <p className="text-zinc-800 text-[9px] font-medium italic">Insights appear here after analysis.</p>
            )}
          </section>

          {/* Videos */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Youtube className="w-3.5 h-3.5 text-red-500" />Video Guides
            </h3>
            {(latestReport?.videos || []).filter(v => v.videoId && v.videoId !== 'dQw4w9WgXcQ').map((vid, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-[#111]">
                <iframe className="w-full aspect-video" src={`https://www.youtube.com/embed/${vid.videoId}?rel=0`} title={vid.title} frameBorder="0" allowFullScreen />
              </div>
            ))}
            {!latestReport?.videos?.filter(v => v.videoId !== 'dQw4w9WgXcQ')?.length && (
              <p className="text-zinc-800 text-[9px] font-medium italic">Legal video guides appear after case analysis.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
};

// ─── Timeout helper ───────────────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
