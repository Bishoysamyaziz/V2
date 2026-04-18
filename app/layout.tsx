import type { Metadata, Viewport } from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { TelemetryProvider } from '@/telemetry/TelemetryProvider';
import Navigation from '@/components/Navigation';
import AIAssistant from '@/components/AIAssistant';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'مستشاري | منصة الاستشارات المهنية', template: '%s | مستشاري' },
  description: 'تواصل مع أفضل الخبراء العرب. استشارات مهنية في القانون، المال، الأعمال، التقنية وأكثر.',
  keywords: ['استشارات', 'خبراء', 'مستشاري', 'consulting', 'NEX'],
  authors: [{ name: 'Mostasharai Team' }],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'مستشاري | منصة الاستشارات المهنية',
    description: 'تواصل مع أفضل الخبراء العرب',
    type: 'website',
    locale: 'ar_EG',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#030507',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen overflow-x-hidden" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <TelemetryProvider>
              <Navigation />
              {/* Desktop: offset for sidebar. Mobile: offset for top bar + bottom nav */}
              <main className="lg:mr-64 pt-14 lg:pt-0 pb-24 lg:pb-8 min-h-screen">
                {children}
              </main>
              <AIAssistant />
            </TelemetryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
