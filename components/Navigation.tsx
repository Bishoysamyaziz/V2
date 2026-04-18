'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import NotificationBell from './NotificationBell';
import Image from 'next/image';
import {
  FaHome, FaUsers, FaWallet, FaVideo, FaSearch,
  FaSignInAlt, FaUserPlus, FaSignOutAlt, FaUser,
  FaCog, FaShieldAlt, FaSun, FaMoon, FaBars, FaTimes,
  FaCalendarAlt, FaChevronDown, FaRocket
} from 'react-icons/fa';

const NAV_ITEMS = [
  { href: '/',         label: 'الرئيسية',  labelEn: 'Home',     icon: FaHome },
  { href: '/experts',  label: 'الخبراء',   labelEn: 'Experts',  icon: FaUsers },
  { href: '/sessions', label: 'جلساتي',    labelEn: 'Sessions', icon: FaCalendarAlt },
  { href: '/wallet',   label: 'المحفظة',   labelEn: 'Wallet',   icon: FaWallet },
  { href: '/reels',    label: 'ريلز',      labelEn: 'Reels',    icon: FaVideo },
];

const MOBILE_NAV = [
  { href: '/',         label: 'الرئيسية', icon: FaHome },
  { href: '/experts',  label: 'الخبراء',  icon: FaUsers },
  { href: '/sessions', label: 'جلساتي',   icon: FaCalendarAlt },
  { href: '/wallet',   label: 'المحفظة',  icon: FaWallet },
  { href: '/reels',    label: 'ريلز',     icon: FaVideo },
];

export default function Navigation() {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => { await logout(); router.push('/login'); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { router.push(`/search?q=${encodeURIComponent(searchQ)}`); setSearchQ(''); }
  };

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* ═══════════ DESKTOP SIDEBAR ═══════════ */}
      <aside
        className="hidden lg:flex flex-col fixed right-0 top-0 h-full w-64 z-40 border-l"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl glow"
            style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}
          >م</div>
          <div>
            <p className="font-black text-base leading-tight" style={{ color: 'var(--color-text)' }}>مستشاري</p>
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-3)' }}>Mostasharai</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="px-4 pt-4 pb-2">
          <div className="relative">
            <FaSearch className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-3)' }} />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="بحث..."
              className="input text-sm pr-10 py-2.5"
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
          </div>
        </form>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <p className="px-3 py-2 text-xs font-black tracking-widest uppercase" style={{ color: 'var(--color-text-3)' }}>
            القائمة
          </p>
          {NAV_ITEMS.map(({ href, label, labelEn, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all mb-0.5 group relative ${active ? '' : 'hover:bg-[var(--color-surface-2)]'}`}
                style={active
                  ? { background: 'var(--color-accent)', color: 'var(--color-text-inv)' }
                  : { color: 'var(--color-text-2)' }
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                <span className="mr-auto text-xs opacity-50">{labelEn}</span>
              </Link>
            );
          })}

          {profile?.role === 'admin_owner' && (
            <>
              <div className="my-3 mx-3 h-px" style={{ background: 'var(--color-border)' }} />
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                style={{ color: 'var(--color-error)', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}
              >
                <FaShieldAlt className="w-4 h-4" />
                <span>غرفة العمليات</span>
                <span className="mr-auto text-xs opacity-60">Admin</span>
              </Link>
            </>
          )}
        </nav>

        {/* Bottom user area */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-[var(--color-surface-2)]"
              >
                <div className="relative">
                  {profile?.photoURL ? (
                    <Image src={profile.photoURL} alt={profile.displayName} width={36} height={36}
                      className="rounded-xl object-cover" style={{ border: '2px solid var(--color-border)' }} />
                  ) : (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
                      style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}>
                      {profile?.displayName?.[0] || '?'}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: 'var(--color-success)', borderColor: 'var(--color-surface)' }} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>
                    {profile?.displayName || 'المستخدم'}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="nex-chip text-xs">{profile?.balanceNEX || 0} NEX</span>
                  </div>
                </div>
                <FaChevronDown
                  className={`w-3 h-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--color-text-3)' }}
                />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute bottom-full right-0 left-0 mb-2 rounded-2xl border shadow-2xl py-2 animate-scale-in"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
                >
                  {[
                    { href: `/profile/${user.uid}`, label: 'ملفي الشخصي', icon: FaUser },
                    { href: '/settings', label: 'الإعدادات', icon: FaCog },
                  ].map(item => (
                    <Link key={item.href} href={item.href}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-surface-3)] transition-colors"
                      style={{ color: 'var(--color-text-2)' }}>
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-surface-3)] transition-colors"
                    style={{ color: 'var(--color-text-2)' }}
                  >
                    {theme === 'dark' ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                    {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
                  </button>
                  <div className="mx-3 my-1 h-px" style={{ background: 'var(--color-border)' }} />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-500/8 transition-colors"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login"
                className="flex-1 btn btn-ghost text-sm py-2.5 rounded-xl">
                دخول
              </Link>
              <Link href="/register"
                className="flex-1 btn btn-primary text-sm py-2.5 rounded-xl">
                تسجيل
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* ═══════════ MOBILE TOP BAR ═══════════ */}
      <header
        className={`lg:hidden fixed top-0 right-0 left-0 z-40 h-14 flex items-center px-4 gap-3 transition-all ${scrolled ? 'glass border-b' : ''}`}
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}>م</div>
          <span className="font-black text-base" style={{ color: 'var(--color-text)' }}>مستشاري</span>
        </Link>

        <div className="flex items-center gap-2">
          {user && <NotificationBell />}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }}
          >
            {mobileOpen ? <FaTimes className="w-4 h-4" /> : <FaBars className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ═══════════ MOBILE DRAWER ═══════════ */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" onClick={() => setMobileOpen(false)}>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
          <div
            className="w-72 h-full border-l overflow-y-auto animate-fade-up"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-black" style={{ color: 'var(--color-text)' }}>القائمة</span>
              <button onClick={() => setMobileOpen(false)} style={{ color: 'var(--color-text-3)' }}>
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all"
                  style={isActive(href)
                    ? { background: 'var(--color-accent)', color: 'var(--color-text-inv)' }
                    : { color: 'var(--color-text-2)' }}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              ))}
              {profile?.role === 'admin_owner' && (
                <Link href="/admin"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold"
                  style={{ color: 'var(--color-error)' }}>
                  <FaShieldAlt className="w-4 h-4" />غرفة العمليات
                </Link>
              )}
            </nav>
            <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {user ? (
                <div className="space-y-2">
                  <Link href={`/profile/${user.uid}`}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--color-surface-2)' }}>
                    {profile?.photoURL ? (
                      <Image src={profile.photoURL} alt={profile.displayName} width={36} height={36}
                        className="rounded-xl object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black"
                        style={{ background: 'var(--color-accent)', color: '#000' }}>
                        {profile?.displayName?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{profile?.displayName}</p>
                      <span className="nex-chip">{profile?.balanceNEX || 0} NEX</span>
                    </div>
                  </Link>
                  <button onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }}>
                    {theme === 'dark' ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                    {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
                  </button>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{ color: 'var(--color-error)', background: 'rgba(244,63,94,0.08)' }}>
                    <FaSignOutAlt className="w-4 h-4" />تسجيل الخروج
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" className="flex-1 btn btn-ghost text-sm py-2.5 rounded-xl">دخول</Link>
                  <Link href="/register" className="flex-1 btn btn-primary text-sm py-2.5 rounded-xl">تسجيل</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MOBILE BOTTOM NAV ═══════════ */}
      <nav
        className="lg:hidden fixed bottom-0 right-0 left-0 z-40 border-t"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-all"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-3)' }}>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: 'var(--color-accent)' }} />
                  )}
                </div>
                <span className="text-[10px] font-bold">{label}</span>
              </Link>
            );
          })}
          {user && (
            <div className="flex-1 flex flex-col items-center justify-center py-3 relative">
              <NotificationBell compact />
              <span className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--color-text-3)' }}>إشعارات</span>
            </div>
          )}
        </div>
        <div className="h-safe-area-bottom" style={{ height: 'env(safe-area-inset-bottom)' }} />
      </nav>
    </>
  );
}
