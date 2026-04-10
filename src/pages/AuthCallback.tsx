/**
 * AuthCallback.tsx
 *
 * Handles Supabase email verification redirect.
 * Supabase sends users to: https://pickup-law-agent.vercel.app/auth/callback?code=xxx
 *
 * This page:
 *  1. Reads the `code` param from the URL
 *  2. Exchanges it for a session via Supabase PKCE flow
 *  3. Redirects to /app on success
 *  4. Shows a friendly error UI if the link is expired or invalid
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { motion } from 'framer-motion';
import { Gavel, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

type CallbackState = 'loading' | 'success' | 'expired' | 'error';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        // Supabase handles the PKCE code exchange automatically when
        // detectSessionInUrl is true (default). We just need to call
        // getSession() after the URL params are processed.
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
          setState('success');
          // Short delay so user sees the success message before redirect
          setTimeout(() => navigate('/app', { replace: true }), 1500);
        } else {
          // No session — try explicit code exchange
          const params = new URLSearchParams(window.location.search);
          const code   = params.get('code');

          if (!code) {
            setState('error');
            setErrorMsg('No verification code found in the link.');
            return;
          }

          const { error: exchError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchError) {
            if (
              exchError.message?.toLowerCase().includes('expired') ||
              exchError.message?.toLowerCase().includes('invalid') ||
              exchError.message?.toLowerCase().includes('already used')
            ) {
              setState('expired');
            } else {
              setState('error');
              setErrorMsg(exchError.message);
            }
            return;
          }

          setState('success');
          setTimeout(() => navigate('/app', { replace: true }), 1500);
        }
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('already used')) {
          setState('expired');
        } else {
          setState('error');
          setErrorMsg(msg || 'Something went wrong. Please try again.');
        }
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-12 bg-black border border-[#1F1F1F] rounded-2xl shadow-2xl space-y-8 text-center"
      >
        <Gavel className="w-14 h-14 text-white mx-auto" />
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
          PickUp Law Agent
        </h2>

        {/* ── Loading ── */}
        {state === 'loading' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mx-auto" />
            <p className="text-zinc-400 text-sm font-medium">Verifying your email...</p>
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Please wait</p>
          </motion.div>
        )}

        {/* ── Success ── */}
        {state === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
            <p className="text-white font-black text-lg">Email Verified!</p>
            <p className="text-zinc-400 text-sm">Redirecting you to the app...</p>
          </motion.div>
        )}

        {/* ── Expired link ── */}
        {state === 'expired' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
            <div>
              <p className="text-white font-black text-lg">Verification Link Expired</p>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                Email verification links expire after <strong className="text-white">24 hours</strong>.
                Please sign up again to receive a new verification link.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/auth', { replace: true })}
              className="w-full interactive-button"
            >
              Back to Sign Up
            </motion.button>
          </motion.div>
        )}

        {/* ── Generic error ── */}
        {state === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <div>
              <p className="text-white font-black text-lg">Verification Failed</p>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                {errorMsg || 'The verification link is invalid or has already been used.'}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/auth', { replace: true })}
              className="w-full interactive-button"
            >
              Try Again
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
