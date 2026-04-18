'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import {
  FaBell, FaBellSlash, FaWallet, FaCalendarAlt, FaHeart,
  FaComment, FaSpinner, FaLock, FaCheckDouble
} from 'react-icons/fa';

const TYPE_ICON: Record<string, any> = {
  deposit: FaWallet, withdrawal: FaWallet,
  consultation: FaCalendarAlt, booking: FaCalendarAlt,
  like: FaHeart, comment: FaComment,
};

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubNotif: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (unsubNotif) { unsubNotif(); unsubNotif = null; }
      if (currentUser) {
        unsubNotif = onSnapshot(
          query(collection(db, 'notifications'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc')),
          snap => { setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
          () => setLoading(false)
        );
      } else {
        setNotifications([]); setLoading(false);
      }
    });
    return () => { unsubAuth(); unsubNotif?.(); };
  }, []);

  const markRead = async (id: string) => {
    try { await updateDoc(doc(db, 'notifications', id), { read: true }); } catch { }
  };
  const markAllRead = async () => {
    try {
      await Promise.all(notifications.filter(n => !n.read).map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch { }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );

  if (!user) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="card p-12">
        <FaLock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-3)' }} />
        <p className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>سجل دخولك لعرض الإشعارات</p>
        <Link href="/login" className="btn-accent inline-block px-8 py-3 rounded-xl">تسجيل الدخول</Link>
      </div>
    </div>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center relative"
            style={{ background: 'var(--color-accent-glow)', border: '1px solid rgba(0,242,255,0.2)' }}>
            <FaBell className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white"
                style={{ background: 'var(--color-error)' }}>{unreadCount}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>الإشعارات</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>{notifications.length} إشعار</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 text-sm font-bold transition-all hover:opacity-80"
            style={{ color: 'var(--color-accent)' }}>
            <FaCheckDouble className="w-3.5 h-3.5" /> تحديد الكل
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card py-20 text-center">
          <FaBellSlash className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-3)' }} />
          <p className="font-bold mb-1" style={{ color: 'var(--color-text)' }}>لا توجد إشعارات</p>
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>ستظهر هنا الإشعارات الجديدة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = TYPE_ICON[n.type] || FaBell;
            return (
              <div key={n.id} onClick={() => !n.read && markRead(n.id)}
                className="flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer hover:opacity-90"
                style={{
                  background: n.read ? 'var(--color-surface)' : 'rgba(0,242,255,0.04)',
                  borderColor: n.read ? 'var(--color-border)' : 'rgba(0,242,255,0.2)',
                  opacity: n.read ? 0.75 : 1,
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={n.read
                    ? { background: 'var(--color-surface-2)', color: 'var(--color-text-3)' }
                    : { background: 'var(--color-accent-glow)', color: 'var(--color-accent)' }}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  {n.title && (
                    <p className="font-bold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>{n.title}</p>
                  )}
                  <p className="text-sm leading-relaxed" style={{ color: n.read ? 'var(--color-text-3)' : 'var(--color-text-2)' }}>
                    {n.message}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
                    {n.createdAt?.toDate?.()?.toLocaleString('ar-EG') || n.createdAt || 'الآن'}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: 'var(--color-accent)' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
