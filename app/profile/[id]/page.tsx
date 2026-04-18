'use client';

import { useState, useEffect, use } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile, subscribeToUserPosts, updateUserProfile, applyToBeExpert, followUser, unfollowUser, checkIsFollowing } from '@/lib/database.adapter';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { uploadFile } from '@/lib/storage.adapter';
import PostCard from '@/components/PostCard';
import {
  FaUser, FaEdit, FaStar, FaShareAlt, FaSpinner, FaTimes,
  FaVideo, FaShieldAlt, FaCheck, FaUserPlus, FaUserCheck
} from 'react-icons/fa';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isApplyingExpert, setIsApplyingExpert] = useState(false);
  const [expertTitle, setExpertTitle] = useState('');
  const [expertBio, setExpertBio] = useState('');
  const [expertRate, setExpertRate] = useState(50);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && profileId !== currentUser.uid) {
        const following = await checkIsFollowing(currentUser.uid, profileId);
        setIsFollowing(following);
      }
    });

    const unsubProfile = onSnapshot(doc(db, 'users', profileId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setEditName(data.displayName || '');
        setEditBio(data.bio || '');
      }
    });

    const unsubPosts = subscribeToUserPosts(profileId, (fetchedPosts) => {
      setPosts(fetchedPosts);
      setLoading(false);
    });

    return () => { unsubAuth(); unsubProfile(); unsubPosts(); };
  }, [profileId]);

  const handleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) { await unfollowUser(user.uid, profileId); setIsFollowing(false); }
      else { await followUser(user.uid, profileId); setIsFollowing(true); }
    } catch { } finally { setFollowLoading(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserProfile(profileId, { displayName: editName, bio: editBio });
      setProfile({ ...profile, displayName: editName, bio: editBio });
      setIsEditing(false);
    } catch { }
  };

  const handleApplyExpert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCardFile) return;
    setUploadingId(true);
    try {
      const idCardURL = await uploadFile(idCardFile, `idCards/${profileId}_${Date.now()}`);
      await applyToBeExpert(profileId, { title: expertTitle, bio: expertBio, hourlyRateNEX: expertRate, categories: ['عام'], idCardURL });
      setIsApplyingExpert(false);
    } catch { } finally { setUploadingId(false); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  const isOwnProfile = user?.uid === profileId;
  const roleLabel = profile?.role === 'admin_owner' ? 'مالك المنصة' : profile?.role === 'expert' ? 'خبير' : 'مستخدم';
  const roleColor = profile?.role === 'admin_owner' ? 'var(--color-error)' : profile?.role === 'expert' ? 'var(--color-accent)' : 'var(--color-text-3)';

  const inputStyle = {
    background: 'var(--color-surface-2)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
  };

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-6">
      {/* Profile Card */}
      <div className="card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(0,242,255,0.04)', transform: 'translate(30%, -30%)' }} />

        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start relative z-10">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile?.photoURL ? (
              <Image src={profile.photoURL} alt={profile.displayName} width={88} height={88}
                className="rounded-2xl object-cover" style={{ border: '2px solid var(--color-border)' }} />
            ) : (
              <div className="w-22 h-22 rounded-2xl flex items-center justify-center font-black text-3xl text-black"
                style={{ width: 88, height: 88, background: 'var(--color-accent)' }}>
                {profile?.displayName?.[0] || '?'}
              </div>
            )}
            {profile?.isLive && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black text-black live-pulse"
                style={{ background: 'var(--color-live)' }}>LIVE</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>
                {profile?.displayName || 'مستخدم'}
              </h1>
              {profile?.isVerified && <FaShieldAlt className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />}
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2"
              style={{ background: `${roleColor}20`, color: roleColor }}>{roleLabel}</span>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-2)' }}>
              {profile?.bio || 'لا يوجد وصف.'}
            </p>

            {/* Stats */}
            <div className="flex justify-center sm:justify-start gap-6 mb-4">
              {[
                { label: 'منشور', value: profile?.postsCount ?? posts.length },
                { label: 'متابع', value: profile?.followersCount || 0 },
                { label: 'رصيد NEX', value: profile?.balanceNEX || 0 },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="font-black text-lg" style={{ color: 'var(--color-accent)' }}>{s.value}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {isOwnProfile ? (
                <>
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'var(--color-accent)', color: '#000' }}>
                    <FaEdit className="w-3.5 h-3.5" /> تعديل
                  </button>
                  {profile?.role !== 'expert' && (
                    <button onClick={() => setIsApplyingExpert(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:opacity-80"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>
                      <FaStar className="w-3.5 h-3.5" /> تصبح خبيراً
                    </button>
                  )}
                  <Link href={`/live/${profileId}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:opacity-80"
                    style={{ borderColor: 'rgba(255,59,48,0.3)', color: 'var(--color-live)', background: 'rgba(255,59,48,0.08)' }}>
                    <FaVideo className="w-3.5 h-3.5" /> بث مباشر
                  </Link>
                </>
              ) : (
                <>
                  <button onClick={handleFollow} disabled={followLoading}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                    style={isFollowing
                      ? { background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                      : { background: 'var(--color-accent)', color: '#000' }}>
                    {followLoading ? <FaSpinner className="w-3.5 h-3.5 animate-spin" /> :
                      isFollowing ? <FaUserCheck className="w-3.5 h-3.5" /> : <FaUserPlus className="w-3.5 h-3.5" />}
                    {isFollowing ? 'متابَع' : 'متابعة'}
                  </button>
                  <button onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:opacity-80"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>
                    {copied ? <FaCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} /> : <FaShareAlt className="w-3.5 h-3.5" />}
                    {copied ? 'تم النسخ' : 'مشاركة'}
                  </button>
                  {profile?.role === 'expert' && (
                    <Link href={`/expert/${profileId}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all hover:opacity-90"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-2)' }}>
                      احجز استشارة
                    </Link>
                  )}
                  {profile?.isLive && (
                    <Link href={`/live/${profileId}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black live-pulse"
                      style={{ background: 'var(--color-live)', color: '#fff' }}>
                      <FaVideo className="w-3.5 h-3.5" /> مشاهدة البث
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="font-black text-lg mb-4" style={{ color: 'var(--color-text)' }}>
          المنشورات <span className="text-sm font-normal" style={{ color: 'var(--color-text-3)' }}>({posts.length})</span>
        </h2>
        {posts.length === 0 ? (
          <div className="card py-16 text-center">
            <FaUser className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-3)' }} />
            <p style={{ color: 'var(--color-text-3)' }}>لا توجد منشورات بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg" style={{ color: 'var(--color-text)' }}>تعديل الملف</h3>
              <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-surface-2)' }}>
                <FaTimes className="w-3.5 h-3.5" style={{ color: 'var(--color-text-2)' }} />
              </button>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>الاسم</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>الوصف</label>
                <textarea rows={3} value={editBio} onChange={e => setEditBio(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none" style={inputStyle} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl font-black text-black"
                  style={{ background: 'var(--color-accent)' }}>حفظ</button>
                <button type="button" onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-xl font-bold border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Expert Modal */}
      {isApplyingExpert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md card p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg" style={{ color: 'var(--color-text)' }}>طلب توثيق كخبير</h3>
              <button onClick={() => setIsApplyingExpert(false)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-surface-2)' }}>
                <FaTimes className="w-3.5 h-3.5" style={{ color: 'var(--color-text-2)' }} />
              </button>
            </div>
            <form onSubmit={handleApplyExpert} className="space-y-4">
              {[
                { label: 'المسمى الوظيفي', placeholder: 'مستشار قانوني، مطور برمجيات...', value: expertTitle, set: setExpertTitle, type: 'text' },
                { label: 'سعر الساعة (NEX)', placeholder: '50', value: expertRate, set: (v: any) => setExpertRate(Number(v)), type: 'number' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>{f.label}</label>
                  <input type={f.type} value={f.value as any} onChange={e => (f.set as any)(e.target.value)}
                    placeholder={f.placeholder} required
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none" style={inputStyle} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>نبذة عن خبرتك</label>
                <textarea rows={3} value={expertBio} onChange={e => setExpertBio(e.target.value)} required
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>صورة الهوية</label>
                <input type="file" accept="image/*" required onChange={e => setIdCardFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none file:ml-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[var(--color-accent)] file:text-black"
                  style={inputStyle} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={uploadingId}
                  className="flex-1 py-3 rounded-xl font-black text-black flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'var(--color-accent)' }}>
                  {uploadingId ? <FaSpinner className="w-4 h-4 animate-spin" /> : null}
                  {uploadingId ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
                <button type="button" onClick={() => setIsApplyingExpert(false)} disabled={uploadingId}
                  className="flex-1 py-3 rounded-xl font-bold border disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
