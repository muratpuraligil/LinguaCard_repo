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
      // Başarılı denemede e-postayı hafızaya al
      localStorage.setItem('lingua_saved_email', email);

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Kayıt başarılı! Giriş yapılıyor...');
        // Otomatik giriş yapması beklenir, ancak bazı configlerde email onayı gerekebilir.
        // Biz yine de akışı bozmayalım.
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
