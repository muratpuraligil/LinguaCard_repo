import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Sparkles } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!supabase) {
      setMessage('Supabase bağlantısı bulunamadı. Demo modu için proje ayarlarını kontrol edin.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Kayıt başarılı! Giriş yapabilirsiniz.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage(error.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F9FF] p-4 font-['Inter']">
      <div className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-sm border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 p-4 rounded-full">
             <Sparkles className="text-yellow-600 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
          {isSignUp ? 'Hesap Oluştur' : 'Hoşgeldin!'}
        </h1>
        <p className="text-center text-slate-500 mb-8 text-sm">
          Kelime öğrenme yolculuğuna {isSignUp ? 'başla' : 'devam et'}.
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="E-posta adresi"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-slate-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Lütfen geçerli bir e-posta adresi girin.')}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Şifre"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-slate-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Lütfen şifrenizi girin.')}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            />
          </div>

          {message && (
            <div className={`text-sm text-center p-2 rounded-lg ${message.includes('başarılı') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 disabled:opacity-70"
          >
            {loading ? 'İşleniyor...' : (isSignUp ? 'Kayıt Ol' : 'Giriş Yap')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
            className="text-sm text-slate-400 hover:text-blue-500 font-medium transition-colors"
          >
            {isSignUp ? 'Zaten hesabın var mı? Giriş Yap' : 'Hesabın yok mu? Kayıt Ol'}
          </button>
        </div>
      </div>
    </div>
  );
}