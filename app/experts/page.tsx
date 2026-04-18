'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import {
  FaStar, FaSearch, FaFilter, FaVideo, FaComments,
  FaBolt, FaShieldAlt, FaSpinner, FaTimes, FaCalendarAlt, FaClock
} from 'react-icons/fa';

const CATEGORIES = ['الكل', 'قانون', 'طب', 'تقنية', 'مالية', 'أعمال', 'تطوير ذات'];

const CAT_ICONS: Record<string, string> = {
  'قانون': '⚖️', 'طب': '🏥', 'تقنية': '💻', 'مالية': '💰', 'أعمال': '📊', 'تطوير ذات': '🚀',
};

export default function ExpertsPage() {
  const [experts, setExperts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [bookingExpert, setBookingExpert] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingDuration, setBookingDuration] = useState(30);
  const [bookingType, setBookingType] = useState<'video' | 'text'>('video');
  const [isBooking, setIsBooking] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'expert'));
        const snap = await getDocs(q);
        setExperts(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      } catch { }
      setLoading(false);
    });
    return unsub;
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredExperts = experts.filter(e => {
    const matchCat = selectedCategory === 'الكل' ? true : e.categories?.includes(selectedCategory);
    const matchSearch = !searchQuery || e.displayName?.includes(searchQuery) || e.title?.includes(searchQuery);
    return matchCat && matchSearch;
  });

  const handleBook = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user || !bookingExpert) return;
    setIsBooking(true);
    try {
      const costNEX = (bookingDuration / 60) * (bookingExpert.hourlyRateNEX || 100);
      await addDoc(collection(db, 'consultations'), {
        clientId: user.uid, expertId: bookingExpert.uid,
        expertName: bookingExpert.displayName, clientName: user.displayName || 'مستخدم',
        scheduledAt: new Date(`${bookingDate}T${bookingTime}`),
        duration: bookingDuration, cost: costNEX, type: bookingType,
        status: 'scheduled', createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'notifications'), {
        userId: bookingExpert.uid, type: 'booking',
        message: `تم حجز استشارة جديدة معك يوم ${bookingDate}`,
        read: false, createdAt: serverTimestamp(),
      });
      setBookingExpert(null);
      showToast('success', 'تم حجز الاستشارة بنجاح! 🎉');
    } catch {
      showToast('error', 'حدث خطأ أثناء الحجز');
    } finally { setIsBooking(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text)' }}>
          <span style={{ color: 'var(--color-accent)' }}>خبراء</span> مستشاري
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>تواصل مع أفضل المتخصصين في مجالك</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث عن خبير..."
            className="w-full rounded-2xl pr-12 pl-4 py-3 text-sm border outline-none"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all"
            style={selectedCategory === cat
              ? { background: 'var(--color-accent)', color: '#000' }
              : { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
            {cat !== 'الكل' && <span>{CAT_ICONS[cat]}</span>}
            {cat}
          </button>
        ))}
      </div>

      {/* Experts Grid */}
      {filteredExperts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExperts.map(expert => (
            <div key={expert.uid} className="card p-5 flex flex-col gap-4 fade-in-up">
              {/* Top */}
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  {expert.photoURL ? (
                    <Image src={expert.photoURL} alt={expert.displayName} width={56} height={56}
                      className="rounded-2xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-black font-black text-xl"
                      style={{ background: 'var(--color-accent)' }}>
                      {expert.displayName?.[0] || '؟'}
                    </div>
                  )}
                  {expert.isOnline && (
                    <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-2 live-pulse"
                      style={{ background: 'var(--color-success)', borderColor: 'var(--color-surface)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base leading-tight truncate" style={{ color: 'var(--color-text)' }}>
                    {expert.displayName}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-2)' }}>
                    {expert.title || 'خبير معتمد'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <FaStar key={i} className="w-3 h-3"
                        style={{ color: i <= Math.round(expert.rating || 4.5) ? '#f59e0b' : 'var(--color-border-2)' }} />
                    ))}
                    <span className="text-xs mr-1" style={{ color: 'var(--color-text-3)' }}>
                      ({expert.reviewsCount || 0})
                    </span>
                  </div>
                </div>
                {expert.isVerified && (
                  <FaShieldAlt className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                )}
              </div>

              {/* Categories */}
              {expert.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {expert.categories.slice(0, 3).map((cat: string) => (
                    <span key={cat} className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'var(--color-accent-glow)', color: 'var(--color-accent)' }}>
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio */}
              {expert.bio && (
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-2)' }}>
                  {expert.bio}
                </p>
              )}

              {/* Price + Actions */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>السعر / ساعة</p>
                  <p className="font-black" style={{ color: 'var(--color-accent)' }}>
                    {expert.hourlyRateNEX || '100'} <span className="text-xs font-medium">NEX</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/expert/${expert.uid}`}
                    className="px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:opacity-80"
                    style={{ borderColor: 'var(--color-border-2)', color: 'var(--color-text-2)' }}>
                    الملف
                  </Link>
                  {user ? (
                    <button onClick={() => setBookingExpert(expert)}
                      className="px-3 py-2 rounded-xl text-xs font-black transition-all hover:opacity-90 flex items-center gap-1.5"
                      style={{ background: 'var(--color-accent)', color: '#000' }}>
                      <FaBolt className="w-3 h-3" />
                      احجز
                    </button>
                  ) : (
                    <Link href="/login"
                      className="px-3 py-2 rounded-xl text-xs font-black transition-all hover:opacity-90"
                      style={{ background: 'var(--color-accent)', color: '#000' }}>
                      سجل دخول
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-bold text-lg mb-2" style={{ color: 'var(--color-text)' }}>لا يوجد خبراء</p>
          <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>حاول تغيير فلتر البحث</p>
        </div>
      )}

      {/* Booking Modal */}
      {bookingExpert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6 relative"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <button onClick={() => setBookingExpert(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }}>
              <FaTimes className="w-3.5 h-3.5" />
            </button>

            <h3 className="font-black text-lg mb-5" style={{ color: 'var(--color-text)' }}>حجز استشارة</h3>

            <div className="flex items-center gap-3 p-3 rounded-2xl mb-5"
              style={{ background: 'var(--color-surface-2)' }}>
              {bookingExpert.photoURL ? (
                <Image src={bookingExpert.photoURL} alt={bookingExpert.displayName} width={44} height={44}
                  className="rounded-xl object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-black"
                  style={{ background: 'var(--color-accent)' }}>
                  {bookingExpert.displayName?.[0]}
                </div>
              )}
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{bookingExpert.displayName}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>{bookingExpert.title}</p>
              </div>
            </div>

            <form onSubmit={handleBook} className="space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                {[{ id: 'video', label: 'فيديو', icon: FaVideo }, { id: 'text', label: 'نصي', icon: FaComments }].map(t => (
                  <button key={t.id} type="button"
                    onClick={() => setBookingType(t.id as any)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border"
                    style={bookingType === t.id
                      ? { background: 'var(--color-accent)', color: '#000', borderColor: 'var(--color-accent)' }
                      : { background: 'var(--color-surface-2)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }}>
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                    <FaCalendarAlt className="inline ml-1 w-3 h-3" />التاريخ
                  </label>
                  <input type="date" required value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                    <FaClock className="inline ml-1 w-3 h-3" />الوقت
                  </label>
                  <input type="time" required value={bookingTime}
                    onChange={e => setBookingTime(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                    style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>المدة</label>
                <select value={bookingDuration} onChange={e => setBookingDuration(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  {[15, 30, 45, 60].map(d => <option key={d} value={d}>{d} دقيقة</option>)}
                </select>
              </div>

              {/* Cost summary */}
              <div className="p-3 rounded-2xl flex items-center justify-between"
                style={{ background: 'var(--color-accent-glow)', border: '1px solid rgba(0,242,255,0.2)' }}>
                <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>التكلفة الإجمالية</span>
                <span className="font-black text-lg" style={{ color: 'var(--color-accent)' }}>
                  {((bookingDuration / 60) * (bookingExpert.hourlyRateNEX || 100)).toFixed(1)} NEX
                </span>
              </div>

              <button type="submit" disabled={isBooking}
                className="w-full py-3.5 rounded-xl font-black text-black transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-accent)' }}>
                {isBooking ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaBolt className="w-4 h-4" />}
                {isBooking ? 'جاري الحجز...' : 'تأكيد الحجز'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[100] px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 fade-in-up`}
          style={toast.type === 'success'
            ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--color-success)' }
            : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)' }}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  );
}
