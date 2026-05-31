"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Panel",
    href: "/dashboard",
    icon: "🏠",
  },
  {
    label: "Ara",
    href: "/kitap-ara",
    icon: "🔎",
  },
  {
    label: "Ekle",
    href: "/kitap-ekle",
    icon: "➕",
    featured: true,
  },
  {
    href: "/kitaplarim",
    label: "Rafım",
    icon: "📚",
  },
  {
    label: "Mesaj",
    href: "/mesajlar",
    icon: "💬",
  },
  {
    label: "Profil",
    href: "/profilim",
    icon: "👤",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const hiddenRoutes = ["/", "/auth/login", "/auth/sign-up", "/auth/forgot-password"];

  const shouldHide =
    hiddenRoutes.includes(pathname) ||
    pathname.startsWith("/auth/");

  if (shouldHide) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2E7D5B]/10 bg-white/95 px-3 pb-3 pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-6 items-end gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.featured) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black shadow-lg transition ${
                    isActive
                      ? "bg-[#F59E0B] text-white shadow-[#F59E0B]/25"
                      : "bg-[#2E7D5B] text-white shadow-[#2E7D5B]/25"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-[10px] font-black text-[#2E7D5B]">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition ${
                isActive
                  ? "bg-[#2E7D5B]/10 text-[#2E7D5B]"
                  : "text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-black">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}