'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { createUserProfile, getUserProfile } from '@/lib/database.adapter';
import { FaEnvelope, FaLock, FaUser, FaGoogle, FaSpinner, FaRocket } from 'react-icons/fa';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const profile = await getUserProfile(userCredential.user.uid);
        if (profile?.isBanned) {
          await auth.signOut();
          throw new Error('تم حظر هذا الحساب من قبل الإدارة.');
        }
        router.push(profile?.role === 'admin_owner' ? '/admin' : '/');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user.uid, { email, displayName: name, role: 'user' });
        router.push('/');
      }
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/user-not-found': 'البريد أو كلمة المرور غير صحيحة',
        'auth/wrong-password': 'البريد أو كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'البريد مستخدم مسبقاً',
        'auth/invalid-email': 'بريد إلكتروني غير صالح',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
      };
      setError(msgs[err.code] || err.message || 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const profile = await getUserProfile(result.user.uid);
      if (profile?.isBanned) {
        await auth.signOut();
        throw new Error('تم حظر هذا الحساب من قبل الإدارة.');
      }
      if (!profile) {
        await createUserProfile(result.user.uid, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          role: 'user',
        });
      }
      router.push(profile?.role === 'admin_owner' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول بحساب جوجل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}>
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--color-accent)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--color-accent)' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl glow"
            style={{ background: 'var(--color-accent)' }}>
            <span className="text-black font-black text-2xl">م</span>
          </div>
          <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text)' }}>مستشاري</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>منصة الاستشارات المهنية العربية</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border p-8 shadow-2xl glass"
          style={{ borderColor: 'var(--color-border)' }}>

          {/* Toggle */}
          <div className="flex rounded-2xl p-1 mb-6" style={{ background: 'var(--color-surface-2)' }}>
            {['login', 'register'].map(mode => (
              <button key={mode}
                onClick={() => setIsLogin(mode === 'login')}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={isLogin === (mode === 'login')
                  ? { background: 'var(--color-accent)', color: '#000' }
                  : { color: 'var(--color-text-2)' }}>
                {mode === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl p-3 mb-4 text-sm text-center border"
              style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <FaUser className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="الاسم الكامل"
                  className="w-full rounded-xl pr-12 pl-4 py-3 text-sm outline-none border transition-all focus:border-[var(--color-accent)]"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>
            )}
            <div className="relative">
              <FaEnvelope className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="البريد الإلكتروني"
                className="w-full rounded-xl pr-12 pl-4 py-3 text-sm outline-none border transition-all focus:border-[var(--color-accent)]"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            <div className="relative">
              <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="كلمة المرور"
                className="w-full rounded-xl pr-12 pl-4 py-3 text-sm outline-none border transition-all focus:border-[var(--color-accent)]"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full rounded-xl py-3.5 font-black text-black transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg glow"
              style={{ background: 'var(--color-accent)' }}>
              {isLoading ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaRocket className="w-4 h-4" />}
              {isLoading ? 'جاري المعالجة...' : (isLogin ? 'دخول' : 'إنشاء حساب')}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>أو</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>

          <button onClick={handleGoogleAuth} disabled={isLoading}
            className="w-full rounded-xl py-3 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 border"
            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            المتابعة بحساب جوجل
          </button>
        </div>
      </div>
    </div>
  );
}
