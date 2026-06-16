import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { NotificationBell } from "@/components/notification-bell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadataBase =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBase),
  title: {
    default: "KampüsRaf",
    template: "%s | KampüsRaf",
  },
  description:
    "Öğrenciler için kitap paylaşımı, takas, sosyal akış ve Rastgele Raf platformu.",
  icons: {
    icon: "/logo-symbol.png",
    apple: "/logo-symbol.png",
  },
  openGraph: {
    title: "KampüsRaf",
    description:
      "Kitaplar paylaşılır, fikirler büyür. Kampüs içi kitap paylaşımı, takas ve sosyal okuma ağı.",
    images: ["/logo-symbol.png"],
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html
    lang="tr"
    className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
  >
    <body className="min-h-full flex flex-col">
      <NotificationBell />
      <div className="flex-1 pb-24 md:pb-0">{children}</div>
      <MobileBottomNav />
    </body>
  </html>
);
}
