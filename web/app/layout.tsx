import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { GA_ID } from "@/lib/analytics";
import { AnalyticsBootstrap } from "@/components/AnalyticsBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "채용공고 관리의 모든 것, 지원함",
    template: "%s",
  },
  description: "흩어진 채용 공고부터 합격 현황까지, 한곳에서 체계적으로 관리하세요! AI 맞춤 공고 추천, 지원 현황 관리, AI 자기소개서 작성까지.",
  keywords: ['채용공고', '취업', '지원관리', '자기소개서', 'AI 자소서', '취업 준비', '채용 추천', '지원함', '취업 플랫폼'],
  authors: [{ name: '지원함' }],
  creator: '지원함',
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  metadataBase: new URL('https://jiwonham.cloud'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '687x687', type: 'image/png' },
    ],
    apple: '/favicon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://jiwonham.cloud',
    siteName: '지원함',
    title: '채용공고 관리의 모든 것, 지원함',
    description: '흩어진 채용 공고부터 합격 현황까지, 한곳에서 체계적으로 관리하세요!',
    images: [{
      url: 'https://jiwonham.cloud/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: '지원함 - 채용공고 관리 서비스',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '채용공고 관리의 모든 것, 지원함',
    description: '흩어진 채용 공고부터 합격 현황까지, 한곳에서 체계적으로 관리하세요!',
    images: ['https://jiwonham.cloud/twitter-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '지원함',
    url: 'https://jiwonham.cloud',
    description: '흩어진 채용 공고부터 합격 현황까지, 한곳에서 체계적으로 관리하세요!',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    inLanguage: 'ko',
  }

  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <Suspense fallback={null}>
            <AnalyticsBootstrap />
          </Suspense>
          {children}
        </AuthProvider>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
