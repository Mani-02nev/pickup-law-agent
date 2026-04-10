import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Gavel, Loader2, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialQuery = (location.state as any)?.initialQuery || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      navigate('/app', { state: { initialQuery } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-12 bg-black border border-[#1F1F1F] rounded-2xl shadow-2xl space-y-12"
      >
        <div className="text-center space-y-6">
          <Gavel className="w-16 h-16 text-white mx-auto" />
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">GATEWAY</h2>
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mt-2">PickUp Legal Intelligence Node</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="System Email"
              className="chat-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Identity Key"
              className="chat-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-600 text-[10px] font-black uppercase text-center tracking-widest">{error}</p>}

          <button 
            disabled={loading}
            className="w-full interactive-button flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Authenticate' : 'Create Identity'}
          </button>
        </form>

        <div className="text-center pt-6">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black text-white uppercase tracking-widest hover:text-zinc-400 transition-colors"
          >
            {isLogin ? "Request New Credentials" : "I have an existing profile"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
