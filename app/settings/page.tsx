'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, updatePassword } from 'firebase/auth';
import { getUserProfile, updateUserProfile } from '@/lib/database.adapter';
import { uploadFile } from '@/lib/storage.adapter';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';
import {
  FaCog, FaUser, FaLock, FaCamera, FaSpinner, FaCheckCircle,
  FaExclamationCircle, FaSun, FaMoon, FaShieldAlt, FaWallet
} from 'react-icons/fa';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'profile' | 'security'>('profile');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await getUserProfile(currentUser.uid);
        if (data) {
          setProfile(data);
          setDisplayName(data.displayName || '');
          setBio(data.bio || '');
          setPhotoURL(data.photoURL || '');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser!, { displayName, photoURL });
      await updateUserProfile(user.uid, { displayName, bio, photoURL });
      showMsg('success', 'تم تحديث الملف الشخصي بنجاح ✓');
    } catch { showMsg('error', 'حدث خطأ أثناء التحديث'); }
    finally { setIsSaving(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setIsSaving(true);
    try {
      await updatePassword(auth.currentUser!, newPassword);
      setNewPassword('');
      showMsg('success', 'تم تغيير كلمة المرور بنجاح ✓');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        showMsg('error', 'سجل الخروج ثم الدخول مجدداً لتغيير كلمة المرور');
      } else {
        showMsg('error', 'حدث خطأ أثناء تغيير كلمة المرور');
      }
    } finally { setIsSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const url = await uploadFile(file, `users/${user.uid}/profile`);
      setPhotoURL(url);
    } catch { showMsg('error', 'فشل رفع الصورة'); }
    finally { setIsUploading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  const roleLabel = profile?.role === 'admin_owner' ? 'مالك المنصة' : profile?.role === 'expert' ? 'خبير معتمد' : 'مستخدم';
  const roleColor = profile?.role === 'admin_owner' ? 'var(--color-error)' : profile?.role === 'expert' ? 'var(--color-accent)' : 'var(--color-text-2)';

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--color-accent-glow)', border: '1px solid rgba(0,242,255,0.2)' }}>
          <FaCog className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>الإعدادات</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>Settings</p>
        </div>
      </div>

      {/* Notification */}
      {msg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl mb-5 text-sm font-bold fade-in-up"
          style={msg.type === 'success'
            ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--color-success)' }
            : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--color-error)' }}>
          {msg.type === 'success' ? <FaCheckCircle className="w-4 h-4" /> : <FaExclamationCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* LEFT: account summary */}
        <div className="space-y-4">
          {/* Avatar card */}
          <div className="card p-5 text-center">
            <label className="relative inline-block cursor-pointer group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-3 relative"
                style={{ border: '2px solid var(--color-border)' }}>
                {isUploading ? (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-surface-2)' }}>
                    <FaSpinner className="w-5 h-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
                  </div>
                ) : photoURL ? (
                  <Image fill src={photoURL} alt="avatar" className="object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-black font-black text-2xl"
                    style={{ background: 'var(--color-accent)' }}>
                    {displayName?.[0] || '?'}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <FaCamera className="w-5 h-5 text-white" />
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
            </label>
            <p className="font-black text-sm" style={{ color: 'var(--color-text)' }}>{displayName || 'اسمك'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: `${roleColor}20`, color: roleColor }}>
              {roleLabel}
            </span>
          </div>

          {/* Stats */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-black" style={{ color: 'var(--color-text-3)' }}>ACCOUNT INFO</p>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>الرصيد</span>
              <span className="font-black text-sm" style={{ color: 'var(--color-accent)' }}>
                {profile?.balanceNEX || 0} NEX
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>الانضمام</span>
              <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ar-EG') : '-'}
              </span>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <FaMoon className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                ) : (
                  <FaSun className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
                )}
                <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {theme === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري'}
                </span>
              </div>
              <button onClick={toggleTheme}
                className="relative w-11 h-6 rounded-full transition-all"
                style={{ background: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-border-2)' }}>
                <span className="absolute top-1 transition-all w-4 h-4 rounded-full bg-white shadow"
                  style={{ right: theme === 'dark' ? '4px' : 'calc(100% - 20px)' }} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: forms */}
        <div className="md:col-span-2 space-y-4">
          {/* Section tabs */}
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--color-surface)' }}>
            {[
              { id: 'profile', label: 'الملف الشخصي', icon: FaUser },
              { id: 'security', label: 'الأمان',       icon: FaLock },
            ].map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id as any)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={activeSection === s.id
                  ? { background: 'var(--color-accent)', color: '#000' }
                  : { color: 'var(--color-text-2)' }}>
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>

          {activeSection === 'profile' && (
            <div className="card p-5 fade-in-up">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>الاسم المعروض</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>البريد الإلكتروني</label>
                  <input type="email" value={user?.email || ''} disabled
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none opacity-50 cursor-not-allowed"
                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>نبذة عنك</label>
                  <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="اكتب نبذة قصيرة عن نفسك..."
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none"
                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
                <button type="submit" disabled={isSaving}
                  className="w-full py-3.5 rounded-xl font-black text-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-accent)' }}>
                  {isSaving ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaCheckCircle className="w-4 h-4" />}
                  حفظ التغييرات
                </button>
              </form>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="card p-5 fade-in-up">
              <div className="flex items-center gap-2 mb-5 p-3 rounded-xl text-xs"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--color-warning)' }}>
                <FaShieldAlt className="w-4 h-4 flex-shrink-0" />
                لتغيير كلمة المرور قد تحتاج تسجيل الخروج والدخول مجدداً
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>كلمة المرور الجديدة</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    minLength={6} placeholder="٦ أحرف على الأقل"
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
                <button type="submit" disabled={isSaving || !newPassword}
                  className="w-full py-3.5 rounded-xl font-bold border transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ borderColor: 'rgba(0,242,255,0.4)', color: 'var(--color-accent)', background: 'rgba(0,242,255,0.05)' }}>
                  {isSaving ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaLock className="w-4 h-4" />}
                  تحديث كلمة المرور
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
