import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel, Plus, LogOut, ChevronRight,
  Globe, Youtube, MessageSquare, History, Trash2, Clock,
  Zap, BookOpen, Scale, GraduationCap, Briefcase, User,
  ChevronDown, Sparkles, Settings
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
import logo from '../logo/PickUp.png';

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

  const [role, setRole]               = useState<UserRole>('Law_Student');
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [mode, setMode]               = useState<AgentMode | null>(null);
  const [chatState, setChatState]     = useState<ChatState>(DEFAULT_CHAT_STATE('Law_Student'));
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
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const isTyping = thinkingState !== 'idle';

  // Sync role from profile
  useEffect(() => {
    if (profile) { setRole(profile.role); setChatState(DEFAULT_CHAT_STATE(profile.role)); }
  }, [profile?.role]);

  // Auth check (allow guests up to 2 queries)
  const isGuest = profile?.id === 'guest';

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

  // Initialization: Load history and latest session
  useEffect(() => {
    let loadedRecent = false;
    try {
      const s = localStorage.getItem('pl_history');
      if (s) {
        let parsed = JSON.parse(s) as SessionRecord[];
        parsed = parsed.filter(h => h.messages && h.messages.length >= 2 && h.label !== 'Session' && h.label !== 'New Query');
        setHistory(parsed);
        localStorage.setItem('pl_history', JSON.stringify(parsed));

        if (parsed.length > 0 && !(location.state as any)?.initialQuery) {
          const latest = parsed[0];
          setSessionId(latest.id);
          setMessages(latest.messages);
          setMode(latest.mode);
          loadedRecent = true;
        }
      }
    } catch {}

    if (!loadedRecent) {
      const q = (location.state as any)?.initialQuery;
      addAgentGreeting();
      if (q) setTimeout(() => handleSend(q), 700);
    }
  }, []);

  // Save session
  useEffect(() => {
    if (messages.length < 2) return;
    const first = messages.find(m => m.role === 'user');
    const label = first ? (typeof first.content === 'string' ? first.content.slice(0, 40) + '...' : 'Legal Analysis') : 'New Query';
    const record: SessionRecord = { id: sessionId, label, mode, messages, createdAt: Date.now() };
    setHistory(prev => {
      const updated = [record, ...prev.filter(h => h.id !== sessionId)].slice(0, 20);
      try { localStorage.setItem('pl_history', JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (profile && profile.id !== 'guest') {
      supabase.from('sessions').upsert({
        id: sessionId,
        user_id: profile.id,
        label,
        mode: mode || 'unknown',
        messages,
        created_at: new Date(record.createdAt).toISOString()
      }).then(({ error }) => {
        if (error) console.error('Supabase sync error:', error);
      });
    }
  }, [messages]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const firstName = profile?.name?.split(' ')[0] || '';

  const addMsg = useCallback((r: 'user' | 'agent', content: string | LegalReport) => {
    setMessages(prev => [...prev, { id: uid(), role: r, content, ts: Date.now() }]);
  }, []);

  function addAgentGreeting() {
    const capName = profile?.name ? profile.name.split(' ')[0].charAt(0).toUpperCase() + profile.name.split(' ')[0].slice(1) : '';
    setMessages([{
      id: uid(), role: 'agent', ts: Date.now(),
      content: capName
        ? `Hello ${capName} 👋 How can I help you today?`
        : `Hello 👋 How can I help you today?`,
    }]);
  }

  function newSession() {
    setSessionId(uid()); setMode(null); setChatState(DEFAULT_CHAT_STATE(role));
    setInput(''); setThinkingState('idle'); setActiveTab('chat');
    setShowRolePanel(false); setSuggestions([]);
    const capName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';
    const greeting = capName
      ? `Hello ${capName} 👋 How can I help you today?`
      : `Hello 👋 How can I help you today?`;
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

    if (profile?.id === 'guest' && profile.queryCount >= 1) {
      navigate('/auth', { state: { initialQuery: userText } });
      return;
    }

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
      const capName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';
      const greeting = capName ? `Hello ${capName}! 👋 How can I help you today?` : `Hello! 👋 How can I help you today?`;
      addMsg('agent', greeting);
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
      setChatState({ step: 1, category, answers: {}, riskScore: 0, isComplete: false, history: [], role });
      setThinkingState('idle');
      const capName  = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';
      const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
      const greeting = capName
        ? `${capName}, this looks like a ${capLabel} matter. Let me ask you a few quick questions to give you the best legal guidance.`
        : `This looks like a ${capLabel} matter. Let me ask you a few quick questions to give you the best legal guidance.`;
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
          <div className="flex items-center gap-3">
            <img src={logo} alt="PickUp Law" className="w-10 h-10 rounded-lg object-contain bg-black" />
            <span className="font-black text-sm tracking-tighter uppercase">PickUp Law</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-600 hover:text-white p-1">✕</button>
        </div>

        {/* Profile card — removed as per request to keep sidebar clean */}

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
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-zinc-600 hover:text-white hover:bg-[#0a0a0a] transition-all text-[10px] font-black uppercase tracking-widest mb-1">
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
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


        </header>

        {/* ── Chat Messages ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar pt-6 pb-[280px] sm:pb-[260px] px-4 md:px-8">
          <div className="max-w-[720px] mx-auto w-full">
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
                        <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => handleChoice(opt)} 
                          disabled={thinkingState !== 'idle' || isTyping}
                          className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#555] text-zinc-200 text-sm font-medium rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
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
                            disabled={isTyping || thinkingState !== 'idle'}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#1a1a1a] hover:border-zinc-600 text-[10px] font-bold text-zinc-400 hover:text-white transition-all bg-[#060606] disabled:opacity-50 disabled:cursor-not-allowed">
                            <span className="text-[12px]">{s.icon}</span>{s.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
        {/* ── SETTINGS MODAL ── */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#050505] border border-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#111] flex justify-between items-center bg-[#0a0a0a]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Preferences
                  </h3>
                  <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
                </div>
                
                <div className="p-5 space-y-6">
                  {/* Profile Name Settings */}
                  {profile && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                        <User className="w-4 h-4 text-emerald-400" /> Display Name
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={nameInput || profile.name} 
                          onChange={e => setNameInput(e.target.value)}
                          placeholder="Your Name"
                          className="flex-1 bg-[#0a0a0a] border border-[#111] focus:border-[#333] rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                        <button 
                          onClick={() => { if (nameInput) updateName(nameInput); }}
                          className="px-4 py-2 bg-[#111] hover:bg-[#1a1a1a] text-zinc-300 text-xs font-bold rounded-xl border border-[#222] transition-colors">
                          Update
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tamil Language Support */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                        <Globe className="w-4 h-4 text-blue-400" /> Tamil Language Mode
                      </div>
                      <div className="w-9 h-5 bg-zinc-800 rounded-full relative cursor-not-allowed opacity-60">
                        <div className="w-3.5 h-3.5 bg-zinc-500 rounded-full absolute top-0.5 left-0.5" />
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed bg-[#0a0a0a] p-3 rounded-xl border border-[#111]">
                      Tamil support requires integration with a live AI backend (like OpenAI or Gemini) to provide flawless translations and eliminate spelling mistakes. Currently, this runs on an offline logic engine.
                    </p>
                  </div>

                  {/* Group Chat Feature */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                        <MessageSquare className="w-4 h-4 text-green-400" /> Group Chat Consultations
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Invite link copied!'); }}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-md transition-colors">
                        Copy Invite Link
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed bg-[#0a0a0a] p-3 rounded-xl border border-[#111]">
                      Share this session link to invite co-founders, family, or other lawyers to collaborate with you.
                    </p>
                  </div>

                  {/* Cloud Sync */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                        <Zap className="w-4 h-4 text-purple-400" /> Cloud Database Sync
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-md">
                        Active
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed bg-[#0a0a0a] p-3 rounded-xl border border-[#111]">
                      Your sessions are securely backed up to the database when logged in.
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-[#111] bg-[#0a0a0a]">
                  <button onClick={() => setShowSettings(false)} className="w-full interactive-button py-3 text-xs">
                    Save & Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

function delay(ms: number) { return new Promise<void>(resolve => setTimeout(resolve, ms)); }
