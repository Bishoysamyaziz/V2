'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FaBell, FaWallet, FaCalendarAlt, FaHeart, FaComment } from 'react-icons/fa';

const TYPE_ICON: Record<string, any> = {
  deposit: FaWallet, withdrawal: FaWallet,
  booking: FaCalendarAlt, session: FaCalendarAlt,
  like: FaHeart, comment: FaComment,
};

interface Props { compact?: boolean; }

export default function NotificationBell({ compact }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    try { await updateDoc(doc(db, 'notifications', id), { read: true }); } catch {}
  };

  const markAllRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.read).map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }))
      );
    } catch {}
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center justify-center rounded-xl transition-all ${
          compact ? 'w-7 h-7' : 'w-9 h-9 hover:bg-[var(--color-surface-2)]'
        }`}
        style={{ color: open ? 'var(--color-accent)' : 'var(--color-text-2)' }}
      >
        <FaBell className="w-4 h-4" />
        {unread > 0 && (
          <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && !compact && (
        <div
          className="absolute left-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl overflow-hidden animate-scale-in z-50"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
              الإشعارات {unread > 0 && <span className="badge badge-error mr-1">{unread}</span>}
            </p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                قراءة الكل
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <FaBell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-3)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>لا إشعارات</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICON[n.type] || FaBell;
                return (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.read) markRead(n.id); setOpen(false); }}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all border-b"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: n.read ? 'transparent' : 'rgba(0,212,255,0.03)',
                      opacity: n.read ? 0.7 : 1,
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={n.read
                        ? { background: 'var(--color-surface-2)', color: 'var(--color-text-3)' }
                        : { background: 'var(--color-accent-glow)', color: 'var(--color-accent)' }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{n.message}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                        {n.createdAt?.toDate?.()?.toLocaleString('ar-EG') || 'الآن'}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ background: 'var(--color-accent)' }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link href="/notifications" onClick={() => setOpen(false)}
              className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
              عرض كل الإشعارات ←
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
