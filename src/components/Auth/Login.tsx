import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { Gavel, Loader2 } from 'lucide-react';

export const Login: React.FC<{ onToggle: () => void }> = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-12 p-12 bg-legal-surface border border-legal-800 rounded-[32px] shadow-2xl">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20">
          <Gavel className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-legal-100 uppercase tracking-tighter">Portal Login</h2>
          <p className="text-legal-400 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">PickUp Legal Intelligence</p>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-8">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-legal-700 uppercase tracking-widest ml-1">Identity</label>
            <input 
              type="email" 
              className="w-full bg-legal-bg border border-legal-800 rounded-xl px-5 py-3.5 text-legal-100 placeholder:text-legal-700 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" 
              placeholder="lawyer@firm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-legal-700 uppercase tracking-widest ml-1">Access Key</label>
            <input 
              type="password" 
              className="w-full bg-legal-bg border border-legal-800 rounded-xl px-5 py-3.5 text-legal-100 placeholder:text-legal-700 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="text-accent text-[10px] font-bold uppercase text-center tracking-widest">{error}</p>}

        <button 
          disabled={loading}
          className="w-full bg-primary hover:bg-yellow-500 text-legal-bg font-black uppercase tracking-widest py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Platform'}
        </button>
      </form>

      <div className="text-center">
        <button onClick={onToggle} className="text-[10px] font-black text-legal-400 hover:text-primary uppercase tracking-[0.2em] transition-colors underline underline-offset-8 decoration-legal-800 hover:decoration-primary">
          Request Access Credentials
        </button>
      </div>
    </div>
  );
};
