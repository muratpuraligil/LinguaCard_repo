import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { BookOpen, ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  // Sayfa yüklendiğinde kayıtlı e-postayı getir
  useEffect(() => {
    const savedEmail = localStorage.getItem('lingua_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

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
      localStorage.setItem('lingua_saved_email', email);

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Kayıt başarılı! Giriş yapılıyor...');
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

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
           redirectTo: window.location.origin 
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Google Login Error:", error);
      if (error.message?.includes('provider is not enabled')) {
         setMessage('HATA: Google Girişi Supabase panelinden aktif edilmemiş. Lütfen "Authentication > Providers > Google" ayarını açın.');
      } else {
         setMessage('Google girişi hatası: ' + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full translate-x-1/3 translate-y-1/3"></div>

      <div className="bg-[#0a0a0a] w-full max-w-md rounded-[48px] p-10 border border-white/10 shadow-2xl relative z-10">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-6 animate-float">
              <BookOpen size={40} strokeWidth={2.5} className="text-white fill-white/10" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                Lingua<span className="text-blue-500">Card</span>
            </h1>
            <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">
                {isSignUp ? 'Yeni Hesap Oluştur' : 'Tekrar Hoşgeldin'}
            </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="relative group">
            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="email"
              placeholder="E-posta adresi"
              className="w-full pl-16 pr-6 py-5 bg-zinc-900 border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 transition-all text-white font-bold placeholder:text-slate-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="relative group">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="password"
              placeholder="Şifre"
              className="w-full pl-16 pr-6 py-5 bg-zinc-900 border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 transition-all text-white font-bold placeholder:text-slate-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {message && (
            <div className={`text-sm font-bold text-center p-4 rounded-2xl border ${message.includes('başarılı') ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>İşleniyor...</span>
                </>
            ) : (
                <>
                    {isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}
                    <ArrowRight size={20} />
                </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">veya</span>
            <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <button 
            onClick={handleGoogleLogin}
            className="w-full py-5 bg-white text-black hover:bg-slate-200 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3"
        >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google ile Devam Et
        </button>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
            className="text-sm text-slate-500 hover:text-white font-bold transition-colors"
          >
            {isSignUp ? 'Zaten hesabın var mı? Giriş Yap' : 'Hesabın yok mu? Kayıt Ol'}
          </button>
        </div>
      </div>
    </div>
  );
}