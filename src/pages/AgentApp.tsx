import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel, Plus, LogOut, ChevronRight,
  Globe, Youtube, MessageSquare, History, Trash2, Clock,
  Zap, BookOpen, Scale, GraduationCap, Briefcase, User,
  ChevronDown, Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../utils/supabase';
import { useUserProfile } from '../utils/useUserProfile';
import { detectMode, AgentMode } from '../logic/modeDetector';
import { classifyIntent } from '../logic/classifier';
import { QUESTION_TREES } from '../logic/questionTree';
import { generateDecision } from '../logic/decisionEngine';
import { handleKnowledgeQuery, handleIPCQuery } from '../logic/knowledgeEngine';
import { fetchWebInsights, fetchYouTubeVideos, CONTENT_LANGUAGES, DEFAULT_LANGUAGE, ContentLanguage } from '../utils/integrations';
import { generateSuggestions } from '../logic/suggestions';
import { LegalReport, ChatState, LegalCategory, UserRole, ThinkingState, Suggestion } from '../logic/types';
import { ChatMessage, AgentStatusBar, TypingIndicator } from '../components/Chat/ChatMessage';

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

// ─── Role Config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG: { id: UserRole; label: string; desc: string; icon: React.FC<any> }[] = [
  { id: 'Advocate',    label: 'Advocate',    desc: 'Professional legal tone',   icon: Briefcase },
  { id: 'Lawyer',      label: 'Lawyer',      desc: 'Structured + clarity',      icon: Scale },
  { id: 'Law_Student', label: 'Law Student', desc: 'Simple + examples',         icon: GraduationCap },
  { id: 'Judge',       label: 'Judge',       desc: 'Analytical + decisive',     icon: BookOpen },
];

const DEFAULT_CHAT_STATE = (role: UserRole): ChatState => ({
  step: 0, category: 'unknown', answers: {}, riskScore: 0,
  isComplete: false, history: [], role,
});

const THINKING_MESSAGES: Record<ThinkingState, string> = {
  idle:       '',
  thinking:   'Analyzing your legal situation...',
  processing: 'Evaluating legal provisions and risk factors...',
  generating: 'Building your structured legal report...',
};

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Main App ─────────────────────────────────────────────────────────────────
export const AgentApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateName, updateRole, incrementQuery } = useUserProfile();

  const [role, setRole]               = useState<UserRole>('Lawyer');
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [mode, setMode]               = useState<AgentMode | null>(null);
  const [chatState, setChatState]     = useState<ChatState>(DEFAULT_CHAT_STATE('Lawyer'));
  const [thinkingState, setThinkingState] = useState<ThinkingState>('idle');
  const [exploreMode, setExploreMode] = useState(false);
  const [history, setHistory]         = useState<SessionRecord[]>([]);
  const [sessionId, setSessionId]     = useState<string>(uid());
  const [activeTab, setActiveTab]     = useState<'chat' | 'insights' | 'videos'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRolePanel, setShowRolePanel] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState('');
  const [videoLang, setVideoLang]     = useState<ContentLanguage>(DEFAULT_LANGUAGE);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const isTyping = thinkingState !== 'idle';

  // Sync role from profile
  useEffect(() => {
    if (profile) { setRole(profile.role); setChatState(DEFAULT_CHAT_STATE(profile.role)); }
  }, [profile?.role]);

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/auth');
    });
  }, []);

  // Quick-query event from InvalidIPCCard suggestion buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent<{ query: string }>).detail?.query;
      if (query) { addMsg('user', query); handleSend(query); }
    };
    window.addEventListener('pl:quick-query', handler);
    return () => window.removeEventListener('pl:quick-query', handler);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinkingState]);

  // Initial query from landing
  useEffect(() => {
    const q = (location.state as any)?.initialQuery;
    addAgentGreeting();
    if (q) setTimeout(() => handleSend(q), 700);
  }, []);

  // Load history
  useEffect(() => {
    try { const s = localStorage.getItem('pl_history'); if (s) setHistory(JSON.parse(s)); } catch {}
  }, []);

  // Save session
  useEffect(() => {
    if (messages.length < 2) return;
    const first = messages.find(m => m.role === 'user');
    const label = first ? (typeof first.content === 'string' ? first.content.slice(0, 50) : 'Legal Analysis') : 'Session';
    const record: SessionRecord = { id: sessionId, label, mode, messages, createdAt: Date.now() };
    setHistory(prev => {
      const updated = [record, ...prev.filter(h => h.id !== sessionId)].slice(0, 20);
      try { localStorage.setItem('pl_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [messages]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const firstName = profile?.name?.split(' ')[0] || '';

  const addMsg = useCallback((r: 'user' | 'agent', content: string | LegalReport) => {
    setMessages(prev => [...prev, { id: uid(), role: r, content, ts: Date.now() }]);
  }, []);

  function addAgentGreeting() {
    setMessages([{
      id: uid(), role: 'agent', ts: Date.now(),
      content: profile?.name
        ? `Hello ${profile.name.split(' ')[0]}! I'm your AI legal assistant. Ask me about any IPC section, constitutional article, or describe your legal situation.`
        : `Hello! I'm your AI legal assistant. Ask me about any IPC section, constitutional article, or describe your legal situation.`,
    }]);
  }

  function newSession() {
    setSessionId(uid()); setMode(null); setChatState(DEFAULT_CHAT_STATE(role));
    setInput(''); setThinkingState('idle'); setActiveTab('chat');
    setShowRolePanel(false); setSuggestions([]);
    const greeting = firstName
      ? `Welcome back, ${firstName}! Start a new legal query or describe your situation.`
      : `Welcome! Start a new legal query or describe your situation.`;
    setMessages([{ id: uid(), role: 'agent', content: greeting, ts: Date.now() }]);
  }

  function loadSession(r: SessionRecord) {
    setSessionId(r.id); setMessages(r.messages); setMode(r.mode); setSidebarOpen(false); setSuggestions([]);
  }

  function deleteSession(id: string) {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      try { localStorage.setItem('pl_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function setThinkingSequence(steps: ThinkingState[], intervalMs = 1200): Promise<void> {
    return new Promise(resolve => {
      let i = 0;
      setThinkingState(steps[0]);
      const timer = setInterval(() => {
        i++;
        if (i < steps.length) { setThinkingState(steps[i]); }
        else { clearInterval(timer); resolve(); }
      }, intervalMs);
    });
  }

  // ─── HANDLE SEND ────────────────────────────────────────────────────────────
  const handleSend = async (forcedInput?: string) => {
    const userText = forcedInput || input.trim();
    if (!userText || isTyping) return;
    setInput('');
    if (!forcedInput) addMsg('user', userText);
    setSuggestions([]);
    setShowRolePanel(false);
    incrementQuery();

    // Mid-case flow — continue question
    if (mode === 'case' && chatState.step > 0 && !chatState.isComplete) {
      setThinkingState('thinking');
      await delay(500);
      await processAnswer(userText);
      return;
    }

    const detectedMode = detectMode(userText);
    setMode(detectedMode);

    // ── GREETING ── human response, no legal engine ──
    if (detectedMode === 'greeting') {
      await delay(350);
      const name = firstName ? `, ${firstName}` : '';
      addMsg('agent', `Hi${name}! 👋 I'm your AI legal assistant. You can ask me about any law, IPC section, or describe your legal issue and I'll guide you.`);
      setSuggestions([
        { icon: '⚖️', label: 'Ask about IPC law',       query: 'IPC 302 explain' },
        { icon: '📋', label: 'Describe a legal issue',   query: 'My brother is taking my property illegally' },
        { icon: '🏛️', label: 'Learn your rights',         query: 'What are my fundamental rights under the Constitution?' },
      ]);
      return;
    }

    // ── CASUAL / acknowledgement ── short reply, no legal engine ──
    if (detectedMode === 'casual') {
      await delay(250);
      const CASUAL_REPLIES = [
        '👍 Got it. Let me know if you need help with any legal question.',
        '✅ Sure! Feel free to ask me anything about Indian law.',
        '😊 Anytime! Ask me about any IPC section or legal issue you\'re facing.',
      ];
      addMsg('agent', CASUAL_REPLIES[Math.floor(Math.random() * CASUAL_REPLIES.length)]);
      return;
    }

    // ── IPC ENGINE ──
    if (detectedMode === 'ipc') {
      await setThinkingSequence(['thinking', 'processing'], 800);
      const report = handleIPCQuery(userText);
      if (exploreMode) {
        const insights = await fetchWebInsights(userText).catch(() => []);
        report.insights = insights;
      }
      setThinkingState('idle');
      addMsg('agent', report);
      setSuggestions(generateSuggestions('ipc'));
      return;
    }

    // ── KNOWLEDGE ENGINE ──
    if (detectedMode === 'knowledge') {
      await setThinkingSequence(['thinking', 'processing'], 800);
      const report = handleKnowledgeQuery(userText);
      if (exploreMode) {
        const insights = await fetchWebInsights(userText).catch(() => []);
        report.insights = insights;
      }
      setThinkingState('idle');
      addMsg('agent', report);
      setSuggestions(generateSuggestions('knowledge'));
      return;
    }

    // ── CASE ENGINE ──
    if (detectedMode === 'case') {
      setThinkingState('thinking');
      const category = classifyIntent(userText);
      const label    = category.replace('_case', '').replace('_', ' ');
      await delay(700);
      setChatState({ step: 1, category, answers: {}, riskScore: 0, isComplete: false, history: [], role });
      setThinkingState('idle');
      const greeting = firstName
        ? `${firstName}, this looks like a ${label} matter. Let me ask you a few quick questions to give you the best legal guidance.`
        : `This looks like a ${label} matter. Let me ask you a few quick questions to give you the best legal guidance.`;
      addMsg('agent', greeting);
      addMsg('agent', QUESTION_TREES[category][0].text);
    }
  };

  // ─── PROCESS CASE ANSWER ────────────────────────────────────────────────────
  const processAnswer = async (value: string, score = 0, nextStep?: string) => {
    const questions = QUESTION_TREES[chatState.category];
    const node      = questions[chatState.step - 1];
    if (!node) { setThinkingState('idle'); return; }

    const newAnswers = { ...chatState.answers, [node.field]: value };
    const newScore   = chatState.riskScore + score;
    const isEnd      = nextStep === 'END' || (!nextStep && chatState.step >= questions.length);

    if (isEnd) {
      // Multi-step thinking for final report
      await setThinkingSequence(['thinking', 'processing', 'generating'], 900);

      const [insRes, vidRes] = await Promise.allSettled([
        exploreMode ? fetchWebInsights(chatState.category.replace('_case', '')) : Promise.resolve([]),
        exploreMode ? fetchYouTubeVideos(chatState.category.replace('_case', ' legal India'), videoLang) : Promise.resolve([]),
      ]);
      const insights = insRes.status === 'fulfilled' ? insRes.value : [];
      const videos   = vidRes.status === 'fulfilled' ? vidRes.value : [];
      const decision = generateDecision(chatState.category, newAnswers, newScore, role, insights, videos);

      setChatState(prev => ({ ...prev, answers: newAnswers, riskScore: newScore, isComplete: true }));
      setThinkingState('idle');
      addMsg('agent', decision);
      setSuggestions(generateSuggestions('case', chatState.category));
      return;
    }

    const nextIndex = nextStep ? questions.findIndex(q => q.id === nextStep) : chatState.step;
    setChatState(prev => ({ ...prev, answers: newAnswers, riskScore: newScore, step: nextIndex + 1 }));
    await delay(400);
    setThinkingState('idle');

    // Context-aware memory: reference earlier answer
    const previousAnswerNote = Object.keys(newAnswers).length > 1
      ? (() => {
          const keys = Object.keys(newAnswers);
          const prev = newAnswers[keys[keys.length - 2]];
          return prev ? ` (Based on what you shared — ${prev.replace(/_/g, ' ')})` : '';
        })()
      : '';

    addMsg('agent', questions[nextIndex].text + (previousAnswerNote ? `\n\n_${previousAnswerNote}_` : ''));
  };

  const handleChoice = (opt: any) => {
    addMsg('user', opt.label);
    processAnswer(opt.value, opt.score || 0, opt.nextStep);
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setSuggestions([]);
    addMsg('user', s.query);
    handleSend(s.query);
  };

  const handleContinue = () => {
    const msg = firstName
      ? `${firstName}, feel free to ask anything else — another IPC section, a new situation, or any legal concept.`
      : `Feel free to ask anything else — another IPC section, a new situation, or any legal concept.`;
    addMsg('agent', msg);
    setSuggestions(generateSuggestions(mode, chatState.category));
    inputRef.current?.focus();
  };

  const handleRoleChange = (r: UserRole) => {
    setRole(r); setChatState(prev => ({ ...prev, role: r }));
    updateRole(r); setShowRolePanel(false);
  };

  const hasOptions     = mode === 'case' && chatState.step > 0 && !chatState.isComplete &&
    (QUESTION_TREES[chatState.category]?.[chatState.step - 1]?.options?.length || 0) > 0;
  const inputDisabled  = isTyping || hasOptions;
  const inputPlaceholder = mode === 'case' && chatState.step > 0 && !chatState.isComplete
    ? 'Type your answer or tap an option above...'
    : 'Describe your legal issue or ask a law question...';

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <aside className={clsx(
        'flex flex-col border-r border-[#111] bg-[#030303] transition-all duration-300 z-40 shrink-0',
        'fixed inset-y-0 left-0 lg:relative',
        sidebarOpen ? 'translate-x-0 w-[270px]' : '-translate-x-full lg:translate-x-0 lg:w-[240px]'
      )}>
        <div className="p-5 pb-4 flex items-center justify-between border-b border-[#111]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shrink-0">
              <Gavel className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-black text-sm tracking-tighter uppercase">PickUp Law</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-600 hover:text-white p-1">✕</button>
        </div>

        {/* Profile card — editable */}
        {profile && (
          <div className="mx-3 mt-3 p-3 bg-[#080808] border border-[#1a1a1a] rounded-xl space-y-2">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xs">
                  {(editingName ? nameInput : profile.name).charAt(0).toUpperCase() || '?'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {editingName ? (
                  /* ── Edit mode ── */
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && nameInput.trim()) {
                          updateName(nameInput.trim());
                          setEditingName(false);
                        }
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                      className="flex-1 bg-transparent border-b border-zinc-600 text-xs font-black text-white outline-none pb-0.5 min-w-0"
                      placeholder="Your name"
                      maxLength={30}
                    />
                    {/* Save */}
                    <button
                      onClick={() => { if (nameInput.trim()) { updateName(nameInput.trim()); setEditingName(false); } }}
                      className="text-green-400 hover:text-green-300 text-[10px] font-black px-1 shrink-0"
                      title="Save"
                    >✓</button>
                    {/* Cancel */}
                    <button
                      onClick={() => setEditingName(false)}
                      className="text-zinc-600 hover:text-zinc-400 text-[10px] font-black px-1 shrink-0"
                      title="Cancel"
                    >✕</button>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div className="flex items-center gap-1.5 group/name">
                    <p className="text-xs font-black text-white truncate">{profile.name}</p>
                    <button
                      onClick={() => { setNameInput(profile.name); setEditingName(true); }}
                      className="opacity-0 group-hover/name:opacity-100 transition-opacity text-zinc-600 hover:text-white"
                      title="Edit name"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="text-[9px] text-zinc-600 font-medium">
                  {profile.queryCount} queries · {profile.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-3">
          <button onClick={newSession} className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#1a1a1a] hover:border-zinc-700 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
            <Plus className="w-3.5 h-3.5" /> New Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
          {history.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <History className="w-7 h-7 text-zinc-800 mx-auto mb-2" />
              <p className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-2 py-3">Recent Sessions</p>
              {history.map(h => (
                <div key={h.id} className="group flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-[#0a0a0a] cursor-pointer transition-colors" onClick={() => loadSession(h)}>
                  <Clock className="w-3 h-3 text-zinc-700 shrink-0" />
                  <span className="flex-1 text-[11px] text-zinc-500 group-hover:text-white truncate font-medium transition-colors">{h.label}</span>
                  <button onClick={e => { e.stopPropagation(); deleteSession(h.id); }} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 p-0.5 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#111]">
          <button onClick={() => supabase.auth.signOut().then(() => navigate('/auth'))} className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-zinc-600 hover:text-white hover:bg-[#0a0a0a] transition-all text-[10px] font-black uppercase tracking-widest">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── MAIN AREA ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black">

        {/* ── Header ── */}
        <header className="shrink-0 border-b border-[#111] bg-black z-20">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-[#111] transition-colors">
                <History className="w-5 h-5 text-zinc-500" />
              </button>
              {firstName && (
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hidden sm:block">
                  Hi, {firstName}
                </span>
              )}
            </div>

            {/* Thinking Status */}
            <AgentStatusBar thinkingState={thinkingState} />

            <button onClick={newSession} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white border border-[#1a1a1a] hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all">
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          {exploreMode && (
            <div className="flex lg:hidden border-t border-[#111]">
              {[
                { id: 'chat',     label: 'Chat',     icon: MessageSquare },
                { id: 'insights', label: 'Insights', icon: Globe },
                { id: 'videos',   label: 'Video',    icon: Youtube },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={clsx('flex-1 py-3 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                    activeTab === tab.id ? 'tab-active' : 'tab-inactive')}>
                  <tab.icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* ── Chat Messages ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar pt-6 pb-[280px] sm:pb-[260px] px-4 md:px-8">
          <div className="max-w-[720px] mx-auto w-full">
            {(activeTab === 'chat' || !exploreMode) && (
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div key={m.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}>
                      <ChatMessage
                        role={m.role}
                        content={m.content}
                        userRole={role}
                        userName={firstName}
                        exploreMode={exploreMode}
                        isLast={i === messages.length - 1}
                        onContinue={handleContinue}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Thinking Indicator */}
                {isTyping && <TypingIndicator state={thinkingState} />}

                {/* Case choice buttons */}
                <AnimatePresence>
                  {!isTyping && mode === 'case' && chatState.step > 0 && !chatState.isComplete && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex flex-wrap gap-2 justify-start pl-10 pt-2">
                      {(QUESTION_TREES[chatState.category]?.[chatState.step - 1]?.options || []).map((opt, i) => (
                        <motion.button key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => handleChoice(opt)} className="interactive-button text-[10px] py-2.5">
                          {opt.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Smart Follow-up Suggestions */}
                <AnimatePresence>
                  {!isTyping && suggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="pt-4 pl-10">
                      <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Explore further
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, i) => (
                          <motion.button key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => handleSuggestionClick(s)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#1a1a1a] hover:border-zinc-600 text-[10px] font-bold text-zinc-400 hover:text-white transition-all bg-[#060606]">
                            <span className="text-[12px]">{s.icon}</span>{s.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM CONTROL PANEL ── */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/98 to-transparent px-4 pt-3 pb-4">
          <div className="max-w-[720px] mx-auto space-y-2.5">

            {/* Role Panel */}
            <AnimatePresence>
              {showRolePanel && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.18 }}
                  className="p-4 bg-[#070707] border border-[#1a1a1a] rounded-2xl space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Choose how you want explanations</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ROLE_CONFIG.map(rc => (
                      <motion.button key={rc.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => handleRoleChange(rc.id)}
                        className={clsx('flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left',
                          role === rc.id ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 border-[#1a1a1a] hover:border-zinc-600 hover:text-white')}>
                        <rc.icon className="w-4 h-4" />
                        <span className="text-[11px] font-black uppercase tracking-wide">{rc.label}</span>
                        <span className={clsx('text-[9px] leading-tight', role === rc.id ? 'text-black/60' : 'text-zinc-600')}>{rc.desc}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls row */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowRolePanel(v => !v)}
                className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shrink-0',
                  showRolePanel ? 'bg-white text-black border-white' : 'border-[#1a1a1a] text-zinc-500 hover:border-zinc-600 hover:text-white')}>
                {(() => { const rc = ROLE_CONFIG.find(r => r.id === role)!; return <><rc.icon className="w-3.5 h-3.5" />{rc.label}</> })()}
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setExploreMode(v => !v); setShowLangPicker(false); }}
                className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shrink-0',
                  exploreMode ? 'bg-white text-black border-white' : 'border-[#1a1a1a] text-zinc-500 hover:border-zinc-600 hover:text-white')}>
                <Zap className={clsx('w-3.5 h-3.5', exploreMode ? 'text-black' : 'text-zinc-600')} />
                Explore {exploreMode ? 'ON' : 'OFF'}
                <span className={clsx('w-7 h-3.5 rounded-full transition-all relative inline-block', exploreMode ? 'bg-black' : 'bg-zinc-700')}>
                  <span className={clsx('absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all', exploreMode ? 'right-0.5 bg-zinc-400' : 'left-0.5 bg-zinc-500')} />
                </span>
              </motion.button>

              {/* Language picker — only when Explore is ON */}
              {exploreMode && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowLangPicker(v => !v)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shrink-0',
                    showLangPicker ? 'bg-white text-black border-white' : 'border-[#1a1a1a] text-zinc-500 hover:border-zinc-600 hover:text-white'
                  )}>
                  <span className="text-sm">{videoLang.flag}</span>
                  {videoLang.label}
                </motion.button>
              )}
            </div>

            {/* Language picker dropdown — scrollable pill row */}
            <AnimatePresence>
              {exploreMode && showLangPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar p-3 bg-[#070707] border border-[#1a1a1a] rounded-2xl">
                  <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest shrink-0">🎥 YouTube Language:</span>
                  {CONTENT_LANGUAGES.map(lang => (
                    <motion.button
                      key={lang.code}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => { setVideoLang(lang); setShowLangPicker(false); }}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all shrink-0',
                        videoLang.code === lang.code
                          ? 'bg-white text-black border-white'
                          : 'border-[#1a1a1a] text-zinc-400 hover:border-zinc-600 hover:text-white'
                      )}>
                      <span className="text-sm">{lang.flag}</span>{lang.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                id="legal-input"
                className="chat-input pr-14"
                style={{ height: '56px', fontSize: '15px' }}
                placeholder={inputPlaceholder}
                value={input}
                disabled={inputDisabled}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !inputDisabled && handleSend()}
              />
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                onClick={() => handleSend()}
                disabled={inputDisabled || !input.trim()}
                className={clsx(
                  'absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                  input.trim() && !inputDisabled ? 'bg-white text-black' : 'bg-[#111] text-zinc-700 cursor-not-allowed'
                )}>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>

            <p className="text-center text-[9px] text-zinc-800 font-medium">
              {firstName ? `${firstName} · ` : ''}{role.replace('_', ' ')} Mode · For reference only
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

function delay(ms: number) { return new Promise<void>(resolve => setTimeout(resolve, ms)); }
