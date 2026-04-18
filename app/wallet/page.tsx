'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { requestDeposit, requestWithdrawal } from '@/lib/payment.adapter';
import { uploadFile } from '@/lib/storage.adapter';
import Link from 'next/link';
import {
  FaWallet, FaArrowDown, FaArrowUp, FaClock, FaCheckCircle,
  FaTimesCircle, FaSpinner, FaTimes, FaUpload, FaHistory,
  FaLock, FaShieldAlt
} from 'react-icons/fa';

const TX_TYPE_LABEL: Record<string, { label: string; color: string; sign: string }> = {
  deposit:      { label: 'إيداع',          color: 'var(--color-success)', sign: '+' },
  withdrawal:   { label: 'سحب',            color: 'var(--color-error)',   sign: '-' },
  session_fee:  { label: 'رسوم جلسة',      color: 'var(--color-error)',   sign: '-' },
  session_earn: { label: 'أرباح جلسة',     color: 'var(--color-success)', sign: '+' },
  commission:   { label: 'عمولة المنصة',   color: 'var(--color-warning)', sign: '-' },
  refund:       { label: 'استرداد',         color: 'var(--color-success)', sign: '+' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: 'قيد المراجعة', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: FaClock },
  approved: { label: 'مقبول',        color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: FaCheckCircle },
  rejected: { label: 'مرفوض',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: FaTimesCircle },
};

export default function WalletPage() {
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview');

  // Deposit
  const [depositAmount, setDepositAmount] = useState('');
  const [proofURL, setProofURL] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');

  useEffect(() => {
    let unsubProfile: () => void;
    let unsubTx: () => void;
    let unsubDep: () => void;
    let unsubWith: () => void;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), snap => setProfile(snap.data()));

        unsubTx = onSnapshot(
          query(collection(db, 'transactions'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc')),
          snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );

        unsubDep = onSnapshot(
          query(collection(db, 'depositRequests'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc')),
          snap => setDepositRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );

        unsubWith = onSnapshot(
          query(collection(db, 'withdrawRequests'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc')),
          snap => {
            setWithdrawRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
      unsubTx?.();
      unsubDep?.();
      unsubWith?.();
    };
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingProof(true);
    try {
      const url = await uploadFile(file, `deposits/${user.uid}`);
      setProofURL(url);
      setProofFileName(file.name);
    } catch { showToast('error', 'فشل رفع الإيصال'); }
    finally { setUploadingProof(false); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !depositAmount || !proofURL) return;
    setIsSubmitting(true);
    try {
      await requestDeposit(user.uid, Number(depositAmount), proofURL);
      setDepositAmount(''); setProofURL(''); setProofFileName('');
      showToast('success', 'تم إرسال طلب الإيداع! ✓');
      setActiveTab('overview');
    } catch { showToast('error', 'حدث خطأ'); }
    finally { setIsSubmitting(false); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawAmount || !withdrawDetails) return;
    if (Number(withdrawAmount) > (profile?.balanceNEX || 0)) {
      showToast('error', 'رصيدك غير كافٍ'); return;
    }
    setIsSubmitting(true);
    try {
      await requestWithdrawal(user.uid, Number(withdrawAmount), withdrawDetails);
      setWithdrawAmount(''); setWithdrawDetails('');
      showToast('success', 'تم إرسال طلب السحب! ✓');
      setActiveTab('overview');
    } catch { showToast('error', 'حدث خطأ'); }
    finally { setIsSubmitting(false); }
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
        <h2 className="text-xl font-black mb-2" style={{ color: 'var(--color-text)' }}>المحفظة</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-2)' }}>سجل دخولك للوصول إلى محفظتك</p>
        <Link href="/login" className="btn-accent inline-block px-8 py-3">تسجيل الدخول</Link>
      </div>
    </div>
  );

  const balance = profile?.balanceNEX || 0;
  const pendingDeposits = depositRequests.filter(r => r.status === 'pending').length;
  const pendingWithdraws = withdrawRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text)' }}>
          <span style={{ color: 'var(--color-accent)' }}>محفظة</span> NEX
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>العملة الرقمية الرسمية لمنصة مستشاري</p>
      </div>

      {/* Balance Card */}
      <div className="rounded-3xl p-6 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1a1a 0%, #051515 100%)', border: '1px solid rgba(0,242,255,0.2)' }}>
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(0,242,255,0.05)', transform: 'translate(-30%, -30%)' }} />
        <div className="relative z-10">
          <p className="text-sm mb-1 flex items-center gap-2" style={{ color: 'rgba(0,242,255,0.7)' }}>
            <FaWallet className="w-4 h-4" /> رصيدك الحالي
          </p>
          <div className="flex items-end gap-3 mb-1">
            <span className="text-5xl font-black text-glow" style={{ color: 'var(--color-accent)' }}>
              {balance.toLocaleString()}
            </span>
            <span className="text-xl font-bold mb-2" style={{ color: 'rgba(0,242,255,0.7)' }}>NEX</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
            ≈ {(balance * 15).toLocaleString()} جنيه مصري
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setActiveTab('deposit')}
              className="flex-1 py-3 rounded-2xl font-black text-black flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: 'var(--color-accent)' }}>
              <FaArrowDown className="w-4 h-4" /> إيداع
            </button>
            <button onClick={() => setActiveTab('withdraw')}
              className="flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80 border"
              style={{ borderColor: 'rgba(0,242,255,0.3)', color: 'var(--color-accent)', background: 'rgba(0,242,255,0.05)' }}>
              <FaArrowUp className="w-4 h-4" /> سحب
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: 'var(--color-surface)' }}>
        {[
          { id: 'overview', label: 'نظرة عامة' },
          { id: 'deposit',  label: 'إيداع' },
          { id: 'withdraw', label: 'سحب' },
          { id: 'history',  label: 'السجل' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={activeTab === tab.id
              ? { background: 'var(--color-accent)', color: '#000' }
              : { color: 'var(--color-text-2)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4 fade-in-up">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'معاملات', value: transactions.length, color: 'var(--color-accent)' },
              { label: 'إيداعات معلقة', value: pendingDeposits, color: 'var(--color-warning)' },
              { label: 'سحوبات معلقة', value: pendingWithdraws, color: 'var(--color-error)' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent transactions */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)' }}>
              <p className="font-black text-sm" style={{ color: 'var(--color-text)' }}>آخر المعاملات</p>
              <button onClick={() => setActiveTab('history')} className="text-xs"
                style={{ color: 'var(--color-accent)' }}>عرض الكل</button>
            </div>
            {transactions.length === 0 ? (
              <div className="py-10 text-center">
                <FaHistory className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-3)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>لا توجد معاملات بعد</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {transactions.slice(0, 5).map(tx => {
                  const cfg = TX_TYPE_LABEL[tx.type] || { label: tx.type, color: 'var(--color-text-2)', sign: '' };
                  return (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{cfg.label}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                          {tx.createdAt?.toDate?.()?.toLocaleDateString('ar-EG') || 'الآن'}
                        </p>
                      </div>
                      <span className="font-black" style={{ color: cfg.color }}>
                        {cfg.sign}{tx.amount ?? tx.amountNEX ?? 0} NEX
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Deposit ── */}
      {activeTab === 'deposit' && (
        <div className="card p-6 fade-in-up">
          <h2 className="font-black text-lg mb-1" style={{ color: 'var(--color-text)' }}>طلب إيداع NEX</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-2)' }}>
            حوّل المبلغ إلى الحساب الرسمي ثم ارفع الإيصال هنا
          </p>
          {/* Bank info */}
          <div className="p-4 rounded-2xl mb-5 text-sm"
            style={{ background: 'var(--color-accent-glow)', border: '1px solid rgba(0,242,255,0.2)' }}>
            <p className="font-black mb-2" style={{ color: 'var(--color-accent)' }}>معلومات التحويل</p>
            <p style={{ color: 'var(--color-text-2)' }}>البنك: بنك مصر — الحساب: 123456789</p>
            <p style={{ color: 'var(--color-text-2)' }}>سعر الصرف: 1 NEX = 15 جنيه</p>
          </div>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>المبلغ (NEX)</label>
              <input type="number" min="10" required value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              {depositAmount && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
                  ≈ {(Number(depositAmount) * 15).toLocaleString()} جنيه مصري
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>إيصال التحويل</label>
              <label className="flex items-center gap-3 rounded-xl px-4 py-3 border cursor-pointer transition-all hover:border-[var(--color-accent)]"
                style={{ background: 'var(--color-surface-2)', borderColor: proofURL ? 'var(--color-success)' : 'var(--color-border)' }}>
                <input type="file" accept="image/*,application/pdf" onChange={handleProofUpload} className="hidden" />
                {uploadingProof ? (
                  <FaSpinner className="w-4 h-4 animate-spin" style={{ color: 'var(--color-accent)' }} />
                ) : proofURL ? (
                  <FaCheckCircle className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                ) : (
                  <FaUpload className="w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
                )}
                <span className="text-sm" style={{ color: proofURL ? 'var(--color-success)' : 'var(--color-text-3)' }}>
                  {proofFileName || 'انقر لرفع الإيصال'}
                </span>
              </label>
            </div>
            <button type="submit" disabled={isSubmitting || !proofURL}
              className="w-full py-3.5 rounded-xl font-black text-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--color-accent)' }}>
              {isSubmitting ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaArrowDown className="w-4 h-4" />}
              إرسال طلب الإيداع
            </button>
          </form>

          {/* Pending deposits */}
          {depositRequests.length > 0 && (
            <div className="mt-6">
              <p className="font-black text-sm mb-3" style={{ color: 'var(--color-text-2)' }}>طلباتك السابقة</p>
              <div className="space-y-2">
                {depositRequests.slice(0, 3).map(r => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  return (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'var(--color-surface-2)' }}>
                      <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                        {r.amountNEX} NEX
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Withdraw ── */}
      {activeTab === 'withdraw' && (
        <div className="card p-6 fade-in-up">
          <h2 className="font-black text-lg mb-1" style={{ color: 'var(--color-text)' }}>طلب سحب NEX</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-2)' }}>
            الرصيد المتاح: <strong style={{ color: 'var(--color-accent)' }}>{balance} NEX</strong>
          </p>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>المبلغ (NEX)</label>
              <input type="number" min="50" max={balance} required value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="الحد الأدنى 50 NEX"
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-2)' }}>بيانات الحساب البنكي</label>
              <textarea rows={3} required value={withdrawDetails}
                onChange={e => setWithdrawDetails(e.target.value)}
                placeholder="اسم البنك، رقم الحساب، اسم صاحب الحساب"
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none"
                style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            <div className="p-3 rounded-xl flex items-start gap-2 text-xs"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--color-warning)' }}>
              <FaShieldAlt className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              يخضع طلب السحب للمراجعة خلال 1-3 أيام عمل. العمولة 2%.
            </div>
            <button type="submit" disabled={isSubmitting || balance < 50}
              className="w-full py-3.5 rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 border"
              style={{ borderColor: 'rgba(0,242,255,0.4)', color: 'var(--color-accent)', background: 'rgba(0,242,255,0.05)' }}>
              {isSubmitting ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaArrowUp className="w-4 h-4" />}
              إرسال طلب السحب
            </button>
          </form>
        </div>
      )}

      {/* ── History ── */}
      {activeTab === 'history' && (
        <div className="card overflow-hidden fade-in-up">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="font-black" style={{ color: 'var(--color-text)' }}>سجل المعاملات</p>
          </div>
          {transactions.length === 0 ? (
            <div className="py-16 text-center">
              <FaHistory className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-3)' }} />
              <p style={{ color: 'var(--color-text-3)' }}>لا توجد معاملات بعد</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {transactions.map(tx => {
                const cfg = TX_TYPE_LABEL[tx.type] || { label: tx.type, color: 'var(--color-text-2)', sign: '' };
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${cfg.color}20` }}>
                        {cfg.sign === '+' ? (
                          <FaArrowDown className="w-4 h-4" style={{ color: cfg.color }} />
                        ) : (
                          <FaArrowUp className="w-4 h-4" style={{ color: cfg.color }} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{cfg.label}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                          {tx.createdAt?.toDate?.()?.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) || 'الآن'}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-base" style={{ color: cfg.color }}>
                      {cfg.sign}{tx.amount ?? tx.amountNEX ?? 0} NEX
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-4 sm:right-8 z-[100] px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 fade-in-up"
          style={toast.type === 'success'
            ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--color-success)' }
            : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)' }}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  );
}
