"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const mainItems = [
  {
    href: "/dashboard",
    label: "Panel",
    icon: "🏠",
  },
  {
    href: "/kitap-ara",
    label: "Ara",
    icon: "🔎",
  },
  {
    href: "/kitap-ekle",
    label: "Ekle",
    icon: "➕",
    primary: true,
  },
  {
    href: "/mesajlar",
    label: "Mesaj",
    icon: "💬",
  },
];

const menuItems = [
  {
    href: "/kitaplarim",
    label: "Rafım",
    icon: "📚",
  },
  {
    href: "/aradigim-kitaplar",
    label: "Aradığım Kitaplar",
    icon: "🔖",
  },
  {
    href: "/eslesmeler",
    label: "Eşleşmeler",
    icon: "🤝",
  },
  {
    href: "/takaslar",
    label: "Takaslarım",
    icon: "🔄",
  },
  {
    href: "/bildirimler",
    label: "Bildirimler",
    icon: "🔔",
  },
  {
    href: "/profilim",
    label: "Profilim",
    icon: "👤",
  },
  {
    href: "/paketler",
    label: "Paketler",
    icon: "⭐",
  },
  {
  href: "/ogrenci-dogrulama",
  label: "Doğrulama",
  icon: "🎓",
},
];

const adminMenuItems = [
  {
    href: "/admin",
    label: "Admin",
    icon: "🛡️",
  },
  {
    href: "/admin/kullanicilar",
    label: "Kullanıcılar",
    icon: "👥",
  },
  {
    href: "/admin/sikayetler",
    label: "Şikayetler",
    icon: "🚩",
  },
  {
    href: "/admin/dogrulamalar",
    label: "Doğrulamalar",
    icon: "🎓",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (isMounted) {
        setIsAdmin(profile?.role === "admin");
      }
    }

    loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  const shouldHide =
    pathname === "/" ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/sign-up");

  if (shouldHide) return null;

  const isMainActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

 const visibleMenuItems = isAdmin
  ? [...adminMenuItems, ...menuItems]
  : menuItems;

const isMenuActive = visibleMenuItems.some(
  (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
);

  return (
    <>
      {isMenuOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] md:hidden"
        />
      )}

      {isMenuOpen && (
        <div className="fixed bottom-[5.7rem] left-3 right-3 z-50 rounded-[1.7rem] border border-[#2E7D5B]/10 bg-white p-4 shadow-2xl shadow-slate-900/20 md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-[#1F2933]">
  {isAdmin ? "Admin & KampüsRaf Menü" : "KampüsRaf Menü"}
</p>
<p className="text-xs font-semibold text-slate-400">
  Diğer sayfalara hızlı erişim
</p>
            </div>

            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF7F0] text-sm font-black text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {visibleMenuItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-2xl p-3 transition ${
                    active
                      ? "bg-[#2E7D5B] text-white"
                      : "bg-[#FAF7F0] text-[#1F2933]"
                  }`}
                >
                  <div className="text-xl">{item.icon}</div>
                  <p className="mt-1 text-xs font-black leading-tight">
                    {item.label}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2E7D5B]/10 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-2xl shadow-slate-900/15 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {mainItems.map((item) => {
            const active = isMainActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition ${
                  item.primary
                    ? "bg-[#2E7D5B] text-white shadow-lg shadow-[#2E7D5B]/25"
                    : active
                      ? "bg-[#2E7D5B]/10 text-[#2E7D5B]"
                      : "text-slate-500"
                }`}
              >
                <span className={item.primary ? "text-xl" : "text-lg"}>
                  {item.icon}
                </span>
                <span className="mt-1 text-[10px] font-black leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition ${
              isMenuOpen || isMenuActive
                ? "bg-[#2E7D5B]/10 text-[#2E7D5B]"
                : "text-slate-500"
            }`}
          >
            <span className="text-lg">☰</span>
            <span className="mt-1 text-[10px] font-black leading-none">
              Menü
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}