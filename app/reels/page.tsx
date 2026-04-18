'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, getDocs, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadVideo } from '@/lib/database.adapter';
import { uploadFile } from '@/lib/storage.adapter';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';

export default function ReelsPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoURL, setVideoURL] = useState('');
  const [caption, setCaption] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribeComments: () => void;
    if (activeVideoId) {
      const q = query(collection(db, `videos/${activeVideoId}/comments`), orderBy('createdAt', 'desc'));
      unsubscribeComments = onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    } else {
      setComments([]);
    }
    return () => {
      if (unsubscribeComments) unsubscribeComments();
    };
  }, [activeVideoId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeVideoId || !newComment.trim()) return;
    
    try {
      const videoRef = doc(db, 'videos', activeVideoId);
      await updateDoc(videoRef, {
        commentsCount: (videos.find(v => v.id === activeVideoId)?.commentsCount || 0) + 1
      });
      
      const commentsRef = collection(db, `videos/${activeVideoId}/comments`);
      await addDoc(commentsRef, {
        userId: user.uid,
        userName: user.displayName || 'مستخدم',
        userPhoto: user.photoURL || '',
        text: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  useEffect(() => {
    let unsubscribeVideos: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        unsubscribeVideos = onSnapshot(q, (snapshot) => {
          setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
      } else {
        setVideos([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeVideos) unsubscribeVideos();
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {}); // Catch auto-play restrictions
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [videos]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoURL.trim()) return;
    try {
      await uploadVideo(user.uid, videoURL, caption);
      setVideoURL('');
      setCaption('');
      setIsUploading(false);
    } catch (error) {
      console.error("Error uploading video:", error);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Check if it's a video
    if (!file.type.startsWith('video/')) {
      alert('يرجى اختيار ملف فيديو صالح.');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadFile(file, `videos/${user.uid}`);
      setVideoURL(url);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert('حدث خطأ أثناء رفع الفيديو.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLike = async (videoId: string, likes: string[]) => {
    if (!user) return;
    const isLiked = likes?.includes(user.uid);
    const videoRef = doc(db, 'videos', videoId);
    
    try {
      if (isLiked) {
        await updateDoc(videoRef, {
          likes: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(videoRef, {
          likes: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleShare = async (videoId: string) => {
    const url = `${window.location.origin}/reels?v=${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('تم نسخ الرابط بنجاح!');
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full  animate-bounce" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className=" backdrop-blur-xl border  rounded-3xl p-12 glow">
          <h2 className="text-2xl font-bold  mb-4 ">ريلز</h2>
          <p className=" mb-8 font-['Tajawal']">يرجى تسجيل الدخول لمشاهدة مقاطع الفيديو.</p>
          <Link href="/login" className="px-8 py-3   font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all inline-block font-['Tajawal']">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] bg-[#050505]">
      {/* Upload Button */}
      <button 
        onClick={() => setIsUploading(true)}
        className="fixed top-24 left-8 z-50 w-12 h-12   rounded-full flex items-center justify-center shadow-[0_0_20px_#00f2ff] hover:scale-110 transition-all"
      >
        
      </button>

      <div className="h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar" ref={containerRef}>
        {videos.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center  font-['Tajawal'] gap-4">
          
          <p>لا توجد مقاطع فيديو حالياً في نيكسوس</p>
        </div>
      ) : (
        videos.map((video) => (
          <div key={video.id} className="relative h-full w-full max-w-md mx-auto snap-start snap-always bg-zinc-950 flex items-center justify-center overflow-hidden border-x border-cyan-500/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <video
              src={video.videoURL}
              className="h-full w-full object-cover"
              loop
              muted // Start muted for autoplay policies
              playsInline
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none" />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end pointer-events-none">
              <div className="flex justify-between items-end gap-4 pb-20 md:pb-6">
                <div className="flex-1 pointer-events-auto">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full border border-cyan-500/30 overflow-hidden bg-zinc-900">
                      <span className="w-full h-full flex items-center justify-center text-cyan-400 font-bold text-xs ">
                        {video.userId.slice(0,2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm font-['Tajawal'] flex items-center gap-1">
                        @{video.userId.slice(0,8)}
                        ✓
                      </h3>
                      <p className="text-[10px] text-cyan-500/70 ">Digital Expert</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-200 text-sm mb-4 line-clamp-3 font-['Tajawal'] leading-relaxed drop-shadow-md">
                    {video.caption}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-cyan-500/10 backdrop-blur-md text-[10px] rounded-full border border-cyan-500/20 text-cyan-400 font-['Tajawal']">#نيكسوس_برايم</span>
                    <span className="px-3 py-1 bg-white/5 backdrop-blur-md text-[10px] rounded-full border border-white/10 text-gray-300 font-['Tajawal']">#استشارة_ذكية</span>
                  </div>
                </div>
                
                {/* Side Actions */}
                <div className="flex flex-col gap-6 items-center pointer-events-auto">
                  <button onClick={() => handleLike(video.id, video.likes || [])} className="flex flex-col items-center gap-1 group">
                    <div className={`w-12 h-12 rounded-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all duration-300 ${video.likes?.includes(user?.uid) ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(0,242,255,0.3)]' : ''}`}>
                      ♥
                    </div>
                    <span className="text-white text-[10px] ">{video.likes?.length || 0}</span>
                  </button>
                  
                  <button onClick={() => setActiveVideoId(video.id)} className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 flex items-center justify-center group-hover:border-cyan-500/50 transition-all duration-300">
                      
                    </div>
                    <span className="text-white text-[10px] ">{video.commentsCount || 0}</span>
                  </button>
                  
                  <button onClick={() => handleShare(video.id)} className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 rounded-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 flex items-center justify-center group-hover:border-cyan-500/50 transition-all duration-300">
                      
                    </div>
                    <span className="text-white text-[10px] font-['Tajawal']">مشاركة</span>
                  </button>

                  <div className="w-10 h-10 rounded-sm bg-zinc-900 border border-white/10 overflow-hidden mt-4 animate-spin-slow">
                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-transparent flex items-center justify-center">
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_#00f2ff] w-0 group-hover:w-full transition-all duration-300" />
          </div>
        ))
      )}
      </div>

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className=" border  rounded-3xl p-8 w-full max-w-md glass">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold  font-['Tajawal']">رفع فيديو جديد</h3>
              <button onClick={() => setIsUploading(false)} className=" hover:">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium  mb-1 font-['Tajawal']">ملف الفيديو</label>
                {videoURL ? (
                  <div className=" border  rounded-xl px-4 py-3  flex items-center justify-between">
                    <span className="text-sm font-['Tajawal']">تم رفع الفيديو بنجاح</span>
                    <button type="button" onClick={() => setVideoURL('')} className="text-error hover:text-error/80">
                      
                    </button>
                  </div>
                ) : (
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={handleVideoUpload}
                    required
                    className="w-full  border  rounded-xl px-4 py-2  focus:outline-none focus:  file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file: file: hover:file:"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium  mb-1 font-['Tajawal']">الوصف</label>
                <textarea 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  className="w-full  border  rounded-xl px-4 py-2  focus:outline-none focus: font-['Tajawal']"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 py-3   font-bold rounded-xl hover:shadow-[0_0_20px_#00f2ff] transition-all font-['Tajawal']">رفع</button>
                <button type="button" onClick={() => setIsUploading(false)} className="flex-1 py-3 border   font-bold rounded-xl hover: transition-all font-['Tajawal']">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Comments Modal */}
      {activeVideoId && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className=" border  rounded-t-3xl sm:rounded-3xl w-full max-w-md h-[70vh] sm:h-[600px] flex flex-col glass animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center p-4 border-b ">
              <h3 className="text-lg font-bold  font-['Tajawal']">التعليقات ({videos.find(v => v.id === activeVideoId)?.commentsCount || 0})</h3>
              <button onClick={() => setActiveVideoId(null)} className=" hover:">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center /50">
                  
                  <p className="font-['Tajawal']">كن أول من يعلق!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full  overflow-hidden flex-shrink-0 relative">
                      {comment.userPhoto ? (
                        <Image fill src={comment.userPhoto} alt={comment.userName} className="object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center  font-bold text-xs">
                          {comment.userName?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs  font-['Tajawal']">{comment.userName}</p>
                      <p className="text-sm  font-['Tajawal'] mt-0.5">{comment.text}</p>
                      <p className="text-[10px] /50 mt-1">
                        {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString('ar-EG') : 'الآن'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="p-4 border-t  flex gap-2  rounded-b-3xl">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="أضف تعليقاً..."
                className="flex-1  border  rounded-full px-4 py-2 text-sm  focus:outline-none focus: font-['Tajawal']"
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="w-10 h-10 rounded-full   flex items-center justify-center disabled:opacity-50 hover:shadow-[0_0_15px_#00f2ff] transition-all"
              >
                ↗
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}