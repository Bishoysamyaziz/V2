'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth, storage } from '@/lib/firebase';
import {
  collection, query, orderBy, limit, startAfter, onSnapshot,
  addDoc, serverTimestamp, getDocs, doc, updateDoc, arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';
import { useInView } from 'react-intersection-observer';
import PostCard from '@/components/PostCard';
import VideoCard from '@/components/VideoCard';
import Link from 'next/link';
import Image from 'next/image';
import {
  FaPlus, FaImage, FaTimes, FaFire, FaClock, FaUsers,
  FaPlay, FaSpinner, FaVideo, FaSearch, FaBolt, FaStar,
  FaArrowLeft
} from 'react-icons/fa';

const PAGE_SIZE = 8;

export default function HomePage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'feed' | 'reels'>('feed');
  const [posts, setPosts] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'trending'>('latest');

  // Post creation
  const [showCreate, setShowCreate] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    setLoadingPosts(true);
    setPosts([]);
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingPosts(false);
    });
    return unsub;
  }, [sortBy]);

  useEffect(() => {
    if (!inView || !hasMore || loadingMore || !lastDoc) return;
    const load = async () => {
      setLoadingMore(true);
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      setPosts(p => [...p, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    };
    load();
  }, [inView]);

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(12));
    return onSnapshot(q, snap => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(10));
    getDocs(q).then(snap => {
      setExperts(snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter((u: any) => u.role === 'expert').slice(0, 5));
    });
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostImage(file);
    const reader = new FileReader();
    reader.onload = ev => setPostPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!postText.trim() || !user || !profile || posting) return;
    setPosting(true);
    try {
      let imageUrl = '';
      if (postImage) {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${postImage.name}`);
        const task = uploadBytesResumable(storageRef, postImage);
        await new Promise<void>((resolve, reject) => {
          task.on('state_changed',
            s => setUploadProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)),
            reject,
            async () => { imageUrl = await getDownloadURL(task.snapshot.ref); resolve(); }
          );
        });
      }
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userDisplayName: profile.displayName,
        userPhotoURL: profile.photoURL || '',
        content: postText.trim(),
        imageUrl,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });
      setPostText(''); setPostImage(null); setPostPreview('');
      setShowCreate(false); setUploadProgress(0);
    } catch (err) { console.error(err); }
    finally { setPosting(false); }
  };

  const PostSkeleton = () => (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-11 h-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-2.5 w-20 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-4/5 rounded" />
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="flex gap-6 items-start">

        {/* ═══ MAIN FEED ═══ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Tab bar */}
          <div className="tab-bar">
            <button className={`tab-item ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
              المنشورات
            </button>
            <button className={`tab-item ${tab === 'reels' ? 'active' : ''}`} onClick={() => setTab('reels')}>
              فيديوهات قصيرة
            </button>
          </div>

          {/* ─── FEED TAB ─── */}
          {tab === 'feed' && (
            <div className="space-y-4">
              {/* Create post box */}
              {user ? (
                <div className="card p-4">
                  {!showCreate ? (
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setShowCreate(true)}
                    >
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden">
                        {profile?.photoURL ? (
                          <Image src={profile.photoURL} alt={profile.displayName} width={40} height={40}
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-sm"
                            style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}>
                            {profile?.displayName?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 rounded-xl px-4 py-3 text-sm cursor-pointer"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)' }}>
                        ماذا يدور في ذهنك؟
                      </div>
                      <button className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}>
                        <FaPlus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden">
                          {profile?.photoURL ? (
                            <Image src={profile.photoURL} alt="" width={36} height={36}
                              className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-sm"
                              style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}>
                              {profile?.displayName?.[0]}
                            </div>
                          )}
                        </div>
                        <textarea
                          value={postText}
                          onChange={e => setPostText(e.target.value)}
                          placeholder="شارك أفكارك، خبراتك، أو اطرح سؤالاً..."
                          rows={3}
                          autoFocus
                          className="input flex-1 resize-none text-sm"
                          style={{ borderRadius: 'var(--radius-lg)' }}
                        />
                      </div>
                      {postPreview && (
                        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#000' }}>
                          <Image src={postPreview} alt="معاينة" fill className="object-cover opacity-90" />
                          <button
                            onClick={() => { setPostImage(null); setPostPreview(''); }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-white"
                            style={{ background: 'rgba(0,0,0,0.6)' }}>
                            <FaTimes className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {posting && uploadProgress > 0 && (
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer transition-colors hover:opacity-70"
                          style={{ color: 'var(--color-text-3)' }}>
                          <FaImage className="w-4 h-4" />
                          <span>إضافة صورة</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowCreate(false); setPostText(''); setPostImage(null); setPostPreview(''); }}
                            className="btn btn-ghost text-sm px-4 py-2">
                            إلغاء
                          </button>
                          <button
                            onClick={handlePost}
                            disabled={!postText.trim() || posting}
                            className="btn btn-primary text-sm px-5 py-2">
                            {posting ? <><FaSpinner className="animate-spin w-3.5 h-3.5" /> نشر...</> : 'نشر'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card-accent p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black" style={{ color: 'var(--color-text)' }}>انضم لمجتمع المحترفين</p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-2)' }}>تواصل مع خبراء واحصل على 50 NEX مجاناً</p>
                  </div>
                  <Link href="/register" className="btn btn-primary px-5 py-2.5 text-sm whitespace-nowrap">
                    ابدأ مجاناً
                  </Link>
                </div>
              )}

              {/* Sort */}
              <div className="flex gap-2">
                {[
                  { key: 'latest', label: 'الأحدث', icon: FaClock },
                  { key: 'trending', label: 'الأكثر تفاعلاً', icon: FaFire },
                ].map(s => (
                  <button key={s.key} onClick={() => setSortBy(s.key as any)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border"
                    style={sortBy === s.key
                      ? { background: 'var(--color-accent)', color: 'var(--color-text-inv)', borderColor: 'var(--color-accent)' }
                      : { background: 'transparent', color: 'var(--color-text-3)', borderColor: 'var(--color-border)' }}>
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Posts */}
              {loadingPosts ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
                </div>
              ) : posts.length === 0 ? (
                <div className="card py-16 text-center">
                  <p className="text-4xl mb-3">✨</p>
                  <p className="font-black text-lg" style={{ color: 'var(--color-text)' }}>كن أول من ينشر!</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-3)' }}>لا توجد منشورات بعد</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {posts.map((post, i) => (
                      <div key={post.id} className="animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                        <PostCard post={post} />
                      </div>
                    ))}
                  </div>
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {loadingMore && <FaSpinner className="animate-spin w-5 h-5" style={{ color: 'var(--color-accent)' }} />}
                    {!hasMore && posts.length > 0 && (
                      <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>— وصلت للنهاية —</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── REELS TAB ─── */}
          {tab === 'reels' && (
            <div>
              {videos.length === 0 ? (
                <div className="card py-16 text-center">
                  <FaVideo className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-3)' }} />
                  <p className="font-black text-lg" style={{ color: 'var(--color-text)' }}>لا توجد فيديوهات بعد</p>
                  <Link href="/reels" className="inline-block mt-4 btn btn-primary px-6 py-2.5 text-sm">
                    استعرض الريلز
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {videos.map(v => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ RIGHT SIDEBAR (desktop) ═══ */}
        <aside className="hidden xl:flex flex-col gap-4 w-64 flex-shrink-0">

          {/* Top experts */}
          {experts.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
                  <FaStar className="inline ml-1.5 w-3.5 h-3.5" style={{ color: 'var(--color-gold)' }} />
                  خبراء مميزون
                </p>
                <Link href="/experts" className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                  عرض الكل
                </Link>
              </div>
              <div className="space-y-3">
                {experts.map(e => (
                  <Link key={e.uid} href={`/expert/${e.uid}`}
                    className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden relative">
                      {e.photoURL ? (
                        <Image src={e.photoURL} alt={e.displayName} width={36} height={36}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-sm"
                          style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}>
                          {e.displayName?.[0]}
                        </div>
                      )}
                      {e.isOnline && <span className="online-dot" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-[var(--color-accent)] transition-colors"
                        style={{ color: 'var(--color-text)' }}>
                        {e.displayName}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-3)' }}>
                        {e.title || 'خبير معتمد'}
                      </p>
                    </div>
                    <span className="nex-chip text-xs">{e.hourlyRateNEX || 80}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick stats / CTA */}
          <div className="card-accent p-4">
            <p className="font-black text-sm mb-1" style={{ color: 'var(--color-accent)' }}>
              <FaBolt className="inline ml-1 w-3.5 h-3.5" />
              ابدأ مسيرتك
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-2)' }}>
              سجل كخبير واكسب من معرفتك
            </p>
            <Link href="/register"
              className="btn btn-primary w-full text-sm py-2.5">
              انضم كخبير
            </Link>
          </div>

          {/* Search link */}
          <Link href="/search"
            className="card-flat flex items-center gap-3 p-3.5 transition-all hover:border-[var(--color-border-glow)]">
            <FaSearch className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-3)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-3)' }}>ابحث في المنصة...</span>
          </Link>

        </aside>
      </div>
    </div>
  );
}
