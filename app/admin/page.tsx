'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, increment, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getUserProfile } from '@/lib/database.adapter';
import { useRouter } from 'next/navigation';
import {
  FaShieldAlt, FaUsers, FaWallet, FaCheck, FaTimes, FaStar,
  FaBan, FaCoins, FaSpinner, FaChartBar, FaExclamationTriangle,
  FaCircle, FaRobot, FaPaperPlane
} from 'react-icons/fa';

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, experts: 0, consultations: 0, revenue: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'experts' | 'users'>('overview');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'مرحباً أيها المالك 👋\nأنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    let subs: (() => void)[] = [];
    const init = async () => {
      if (!auth.currentUser) { router.push('/login'); return; }
      const profile = await getUserProfile(auth.currentUser.uid);
      const isSuperAdmin = auth.currentUser.email === 'bishoysamy390@gmail.com';
      if (profile?.role !== 'admin_owner' && !isSuperAdmin) { router.push('/'); return; }
      setIsAdmin(true);

      subs.push(onSnapshot(
        query(collection(db, 'depositRequests'), where('status', '==', 'pending')),
        snap => setDepositRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ));
      subs.push(onSnapshot(
        query(collection(db, 'withdrawRequests'), where('status', '==', 'pending')),
        snap => setWithdrawRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ));
      subs.push(onSnapshot(
        query(collection(db, 'users'), where('expertStatus', '==', 'pending')),
        snap => setExperts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ));
      subs.push(onSnapshot(collection(db, 'users'), snap => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }));

      // Stats
      const [uSnap, cSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'consultations')),
      ]);
      let rev = 0;
      cSnap.docs.forEach(d => { const data = d.data(); if (data.status === 'completed') rev += (data.cost || 0) * 0.1; });
      const expCount = uSnap.docs.filter(d => d.data().role === 'expert').length;
      setStats({ users: uSnap.size, experts: expCount, consultations: cSnap.size, revenue: rev });
    };
    init();
    return () => subs.forEach(u => u());
  }, [router]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3500);
  };

  const approveDeposit = async (req: any) => {
    try {
      await updateDoc(doc(db, 'depositRequests', req.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', req.userId), { balanceNEX: increment(req.amountNEX) });
      await addDoc(collection(db, 'transactions'), { userId: req.userId, type: 'deposit', amount: req.amountNEX, createdAt: serverTimestamp() });
      await addDoc(collection(db, 'notifications'), { userId: req.userId, message: `تم إضافة ${req.amountNEX} NEX لمحفظتك ✓`, read: false, createdAt: serverTimestamp() });
      showToast('success', 'تمت الموافقة على الإيداع ✓');
    } catch { showToast('error', 'حدث خطأ'); }
  };

  const rejectDeposit = async (req: any) => {
    try {
      await updateDoc(doc(db, 'depositRequests', req.id), { status: 'rejected' });
      await addDoc(collection(db, 'notifications'), { userId: req.userId, message: 'تم رفض طلب الإيداع الخاص بك', read: false, createdAt: serverTimestamp() });
      showToast('success', 'تم رفض الطلب');
    } catch { showToast('error', 'حدث خطأ'); }
  };

  const approveWithdraw = async (req: any) => {
    try {
      await updateDoc(doc(db, 'withdrawRequests', req.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', req.userId), { balanceNEX: increment(-req.amountNEX) });
      await addDoc(collection(db, 'transactions'), { userId: req.userId, type: 'withdrawal', amount: req.amountNEX, createdAt: serverTimestamp() });
      showToast('success', 'تمت الموافقة على السحب ✓');
    } catch { showToast('error', 'حدث خطأ'); }
  };

  const rejectWithdraw = async (req: any) => {
    try {
      await updateDoc(doc(db, 'withdrawRequests', req.id), { status: 'rejected' });
      showToast('success', 'تم رفض طلب السحب');
    } catch { showToast('error', 'حدث خطأ'); }
  };

  const approveExpert = async (u: any) => {
    try {
      await updateDoc(doc(db, 'users', u.id), { role: 'expert', expertStatus: 'approved' });
      showToast('success', `تم توثيق ${u.displayName} كخبير ✓`);
    } catch { showToast('error', 'حدث خطأ'); }
  };

  const toggleBan = async (u: any) => {
    try {
      await updateDoc(doc(db, 'users', u.id), { isBanned: !u.isBanned });
      showToast('success', u.isBanned ? 'تم رفع الحظر' : 'تم حظر المستخدم');
    } catch { showToast('error', 'حدث خطأ'); }
  };

  const chargeUser = async (u: any, amount: number) => {
    try {
      await updateDoc(doc(db, 'users', u.id), { balanceNEX: increment(amount) });
      await addDoc(collection(db, 'transactions'), { userId: u.id, type: 'deposit', amount, createdAt: serverTimestamp() });
      showToast('success', `تم شحن ${amount} NEX ✓`);
    } catch { showToast('error', 'حدث خطأ'); }
  };

  const sendChat = () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(p => [...p, { role: 'user', text: msg }]);
    setChatLoading(true);
    setTimeout(() => {
      const replies: Record<string, string> = {
        'إحصائيات': `📊 الإحصائيات:\n• المستخدمون: ${stats.users}\n• الخبراء: ${stats.experts}\n• الجلسات: ${stats.consultations}\n• الإيرادات: ${stats.revenue.toFixed(0)} NEX`,
        'طلبات': `📋 الطلبات المعلقة:\n• إيداع: ${depositRequests.length}\n• سحب: ${withdrawRequests.length}\n• توثيق: ${experts.length}`,
      };
      const reply = Object.entries(replies).find(([k]) => msg.includes(k))?.[1]
        ?? 'مفهوم! سأعالج هذا الأمر. استخدم التبويبات أعلاه لإدارة الطلبات.';
      setChatMessages(p => [...p, { role: 'bot', text: reply }]);
      setChatLoading(false);
    }, 800);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );
  if (!isAdmin) return null;

  const TABS = [
    { id: 'overview',    label: 'نظرة عامة',   badge: 0 },
    { id: 'deposits',    label: 'إيداعات',      badge: depositRequests.length },
    { id: 'withdrawals', label: 'سحوبات',       badge: withdrawRequests.length },
    { id: 'experts',     label: 'توثيق',        badge: experts.length },
    { id: 'users',       label: 'مستخدمون',     badge: 0 },
  ];

  const inputStyle = { background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black"
          style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.25)', color: 'var(--color-accent)' }}>
          <FaCircle className="w-2 h-2 animate-pulse" /> ACTIVE INTEL
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>غرفة العمليات</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>Owner Control Room</p>
        </div>
        <div className="mr-auto flex items-center gap-2">
          <FaShieldAlt className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>مالك المنصة</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'مستخدمون', value: stats.users, icon: FaUsers, color: 'var(--color-accent)' },
              { label: 'خبراء',    value: stats.experts, icon: FaStar, color: 'var(--color-warning)' },
              { label: 'جلسات',    value: stats.consultations, icon: FaChartBar, color: '#6366f1' },
              { label: 'إيرادات',  value: `${stats.revenue.toFixed(0)} N`, icon: FaCoins, color: 'var(--color-success)' },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <s.icon className="w-5 h-5 mb-2" style={{ color: s.color }} />
                <p className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                className="relative flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={activeTab === t.id
                  ? { background: 'var(--color-accent)', color: '#000' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
                {t.label}
                {t.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white"
                    style={{ background: 'var(--color-error)' }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="card p-5 fade-in-up space-y-3">
              <p className="font-black" style={{ color: 'var(--color-text)' }}>ملخص النشاط</p>
              {[
                { label: 'طلبات إيداع معلقة', value: depositRequests.length, color: 'var(--color-warning)' },
                { label: 'طلبات سحب معلقة',  value: withdrawRequests.length, color: 'var(--color-error)' },
                { label: 'طلبات توثيق خبراء', value: experts.length, color: 'var(--color-accent)' },
                { label: 'إجمالي المستخدمين', value: users.length, color: 'var(--color-success)' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--color-surface-2)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>{r.label}</span>
                  <span className="font-black" style={{ color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Deposits */}
          {activeTab === 'deposits' && (
            <div className="card overflow-hidden fade-in-up">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-black" style={{ color: 'var(--color-text)' }}>طلبات الإيداع ({depositRequests.length})</p>
              </div>
              {depositRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <FaCheck className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-success)' }} />
                  <p style={{ color: 'var(--color-text-3)' }}>لا توجد طلبات معلقة</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {depositRequests.map(req => (
                    <div key={req.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                            {req.userId?.slice(0, 8)}...
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                            {req.createdAt?.toDate?.()?.toLocaleDateString('ar-EG') || 'الآن'}
                          </p>
                        </div>
                        <span className="font-black text-lg" style={{ color: 'var(--color-accent)' }}>
                          {req.amountNEX} NEX
                        </span>
                      </div>
                      {req.proofURL && (
                        <a href={req.proofURL} target="_blank" rel="noreferrer"
                          className="inline-block text-xs mb-3 underline" style={{ color: 'var(--color-accent)' }}>
                          عرض الإيصال ↗
                        </a>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => approveDeposit(req)}
                          className="flex-1 py-2 rounded-xl text-sm font-black text-black flex items-center justify-center gap-1"
                          style={{ background: 'var(--color-success)' }}>
                          <FaCheck className="w-3 h-3" /> موافقة
                        </button>
                        <button onClick={() => rejectDeposit(req)}
                          className="flex-1 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-1"
                          style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <FaTimes className="w-3 h-3" /> رفض
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Withdrawals */}
          {activeTab === 'withdrawals' && (
            <div className="card overflow-hidden fade-in-up">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-black" style={{ color: 'var(--color-text)' }}>طلبات السحب ({withdrawRequests.length})</p>
              </div>
              {withdrawRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <FaCheck className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-success)' }} />
                  <p style={{ color: 'var(--color-text-3)' }}>لا توجد طلبات معلقة</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {withdrawRequests.map(req => (
                    <div key={req.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{req.userId?.slice(0, 8)}...</p>
                        <span className="font-black" style={{ color: 'var(--color-error)' }}>-{req.amountNEX} NEX</span>
                      </div>
                      {req.bankDetails && (
                        <p className="text-xs mb-3 p-2 rounded-lg" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }}>
                          {req.bankDetails}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => approveWithdraw(req)}
                          className="flex-1 py-2 rounded-xl text-sm font-black text-black"
                          style={{ background: 'var(--color-success)' }}>موافقة</button>
                        <button onClick={() => rejectWithdraw(req)}
                          className="flex-1 py-2 rounded-xl text-sm font-black"
                          style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.3)' }}>رفض</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expert approvals */}
          {activeTab === 'experts' && (
            <div className="card overflow-hidden fade-in-up">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-black" style={{ color: 'var(--color-text)' }}>طلبات توثيق الخبراء ({experts.length})</p>
              </div>
              {experts.length === 0 ? (
                <div className="py-12 text-center">
                  <FaStar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-warning)' }} />
                  <p style={{ color: 'var(--color-text-3)' }}>لا توجد طلبات معلقة</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {experts.map(u => (
                    <div key={u.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold" style={{ color: 'var(--color-text)' }}>{u.displayName}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>{u.expertTitle || u.title}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>{u.expertBio || u.bio}</p>
                        </div>
                        <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                          {u.hourlyRateNEX || 100} NEX/h
                        </span>
                      </div>
                      {u.idCardURL && (
                        <a href={u.idCardURL} target="_blank" rel="noreferrer"
                          className="inline-block text-xs mb-3 underline" style={{ color: 'var(--color-accent)' }}>
                          عرض الهوية ↗
                        </a>
                      )}
                      <button onClick={() => approveExpert(u)}
                        className="w-full py-2 rounded-xl text-sm font-black text-black flex items-center justify-center gap-2"
                        style={{ background: 'var(--color-accent)' }}>
                        <FaCheck className="w-3 h-3" /> توثيق كخبير
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="card overflow-hidden fade-in-up">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-black" style={{ color: 'var(--color-text)' }}>إدارة المستخدمين ({users.length})</p>
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: u.isBanned ? 'var(--color-text-3)' : 'var(--color-text)' }}>
                        {u.displayName || 'مستخدم'}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-3)' }}>{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-accent-glow)', color: 'var(--color-accent)' }}>
                        {u.balanceNEX || 0} N
                      </span>
                      <button onClick={() => {
                        const a = prompt('مبلغ الشحن (NEX):');
                        if (a && !isNaN(Number(a))) chargeUser(u, Number(a));
                      }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                        style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }}>
                        <FaCoins className="w-3 h-3" />
                      </button>
                      <button onClick={() => toggleBan(u)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                        style={u.isBanned
                          ? { background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }
                          : { background: 'rgba(239,68,68,0.15)', color: 'var(--color-error)' }}>
                        <FaBan className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: AI Chat */}
        <div className="space-y-4">
          <div className="card overflow-hidden h-[500px] flex flex-col"
            style={{ border: '1px solid rgba(0,242,255,0.15)' }}>
            <div className="flex items-center gap-3 p-4" style={{ background: 'rgba(0,242,255,0.05)', borderBottom: '1px solid rgba(0,242,255,0.1)' }}>
              <FaRobot className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              <div>
                <p className="font-black text-sm" style={{ color: 'var(--color-accent)' }}>مساعد المالك</p>
                <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>Owner AI Assistant</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap"
                    style={m.role === 'user'
                      ? { background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: '4px 16px 16px 16px' }
                      : { background: 'rgba(0,242,255,0.12)', color: 'var(--color-accent)', borderRadius: '16px 4px 16px 16px' }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-end">
                  <div className="px-3 py-2.5 rounded-2xl flex gap-1"
                    style={{ background: 'rgba(0,242,255,0.12)', borderRadius: '16px 4px 16px 16px' }}>
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: 'var(--color-accent)', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="اسأل عن الإحصائيات، الطلبات..."
                className="flex-1 rounded-xl px-3 py-2 text-xs border outline-none" style={inputStyle} />
              <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40"
                style={{ background: 'var(--color-accent)', color: '#000' }}>
                <FaPaperPlane className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card p-4">
            <p className="font-black text-sm mb-3" style={{ color: 'var(--color-text-2)' }}>أوامر سريعة</p>
            <div className="space-y-2">
              {[
                { label: 'طلبات الإيداع', badge: depositRequests.length, tab: 'deposits', color: 'var(--color-warning)' },
                { label: 'طلبات السحب',  badge: withdrawRequests.length, tab: 'withdrawals', color: 'var(--color-error)' },
                { label: 'توثيق الخبراء', badge: experts.length, tab: 'experts', color: 'var(--color-accent)' },
              ].map(a => (
                <button key={a.tab} onClick={() => setActiveTab(a.tab as any)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-sm transition-all hover:opacity-80"
                  style={{ background: 'var(--color-surface-2)' }}>
                  <span style={{ color: 'var(--color-text-2)' }}>{a.label}</span>
                  {a.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black"
                      style={{ background: `${a.color}25`, color: a.color }}>
                      {a.badge} معلق
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-4 sm:right-8 z-[100] px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold fade-in-up"
          style={toast.type === 'success'
            ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--color-success)' }
            : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
