import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Gavel, Loader2, Mail, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Translate raw Supabase errors into friendly messages ────────────────────
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Incorrect email or password. Please try again.';
  if (m.includes('email not confirmed'))   return 'Please verify your email first. Check your inbox for the verification link.';
  if (m.includes('user already registered') || m.includes('already registered')) return 'This email is already registered. Try logging in instead.';
  if (m.includes('password') && m.includes('weak'))  return 'Password must be at least 6 characters.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a few minutes and try again.';
  if (m.includes('network') || m.includes('fetch'))  return 'Connection error. Please check your internet and try again.';
  if (m.includes('expired'))   return 'Your session has expired. Please log in again.';
  if (m.includes('not found')) return 'No account found with this email. Please sign up first.';
  return msg; // last resort — show original (already sanitised by Supabase)
}

type AuthView = 'login' | 'signup' | 'verify_sent';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialQuery = (location.state as any)?.initialQuery || '';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [view, setView]         = useState<AuthView>('login');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // ── Handle login ────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/app', { replace: true, state: { initialQuery } });
    } catch (err: any) {
      setError(friendlyError(err.message || 'Login failed.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Handle signup ───────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // This must match the Site URL + Redirect URL configured in Supabase dashboard
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;

      // Show "check your email" screen
      setView('verify_sent');
    } catch (err: any) {
      setError(friendlyError(err.message || 'Sign up failed.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Handle resend verification email ────────────────────────────────────────
  const handleResend = async () => {
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(friendlyError(err.message || 'Could not resend email.'));
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── VIEW: Email verification sent ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'verify_sent') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full p-12 bg-black border border-[#1F1F1F] rounded-2xl shadow-2xl space-y-8 text-center"
        >
          <Gavel className="w-14 h-14 text-white mx-auto" />
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
              Verify Your Email
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We sent a verification link to
            </p>
            <p className="text-white font-black text-sm border border-[#1a1a1a] rounded-xl px-4 py-2 bg-[#080808]">
              {email}
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed pt-2">
              Click the link in the email to activate your account.<br />
              The link expires in <strong className="text-zinc-300">24 hours</strong>.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-900/30 bg-red-950/10">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleResend}
              disabled={loading}
              className="w-full interactive-button flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Resend Verification Email
            </motion.button>

            <button
              onClick={() => { setView('login'); setError(''); }}
              className="text-[10px] font-black text-zinc-600 hover:text-white uppercase tracking-widest transition-colors"
            >
              Back to Login
            </button>
          </div>

          <p className="text-[9px] text-zinc-800 uppercase tracking-widest">
            Check your spam folder if you don't see the email
          </p>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── VIEW: Login / Signup form ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const isLogin = view === 'login';

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-12 bg-black border border-[#1F1F1F] rounded-2xl shadow-2xl space-y-10"
      >
        {/* Header */}
        <div className="text-center space-y-5">
          <Gavel className="w-14 h-14 text-white mx-auto" />
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">GATEWAY</h2>
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
              PickUp Legal Intelligence Node
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border border-[#1a1a1a] rounded-xl overflow-hidden">
          {(['login', 'signup'] as AuthView[]).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setError(''); }}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                view === v ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'
              }`}
            >
              {v === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="email"
              placeholder="Email address"
              className="chat-input pl-11"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              className="chat-input pl-11"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl border border-red-900/30 bg-red-950/10"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs leading-relaxed">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="w-full interactive-button flex items-center justify-center gap-3 disabled:opacity-50 mt-2"
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : isLogin ? 'Login' : 'Create Account'}
          </motion.button>
        </form>

        {/* Helper text */}
        {!isLogin && (
          <p className="text-center text-[9px] text-zinc-700 leading-relaxed">
            After signing up, check your email for a verification link.<br />
            The link will redirect you directly into the app.
          </p>
        )}
      </motion.div>
    </div>
  );
};
