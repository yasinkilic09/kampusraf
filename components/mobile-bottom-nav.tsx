"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MobileBottomNavProps = {
  isAdmin?: boolean;
};

type MenuItem = {
  title: string;
  href: string;
  icon: string;
  description?: string;
};

const hiddenPathPrefixes = [
  "/auth",
  "/tanitim",
  "/hesap-kisitlandi",
];

const mainItems = [
  {
    title: "Panel",
    href: "/dashboard",
    icon: "🏠",
  },
  {
    title: "Akış",
    href: "/akis",
    icon: "🌿",
  },
  {
    title: "Paylaş",
    href: "/paylas",
    icon: "📸",
    featured: true,
  },
  {
    title: "Ara",
    href: "/kitap-ara",
    icon: "🔎",
  },
];

const socialMenuItems: MenuItem[] = [
  {
    title: "Mesajlar",
    href: "/mesajlar",
    icon: "💬",
    description: "Sohbetlerini görüntüle",
  },
  {
    title: "Arkadaşlar",
    href: "/arkadaslar",
    icon: "👥",
    description: "Arkadaşlık istekleri ve çevren",
  },
  {
    title: "Bildirimler",
    href: "/bildirimler",
    icon: "🔔",
    description: "Yeni gelişmeleri takip et",
  },
  {
    title: "Profilim",
    href: "/profilim",
    icon: "👤",
    description: "Profil ve sosyal ayarlar",
  },
];

const bookMenuItems: MenuItem[] = [
  {
    title: "Rafım",
    href: "/kitaplarim",
    icon: "📚",
    description: "Eklediğin kitaplar",
  },
  {
    title: "Kitap Ekle",
    href: "/kitap-ekle",
    icon: "➕",
    description: "Rafına yeni kitap ekle",
  },
  {
    title: "Aradığım Kitaplar",
    href: "/aradigim-kitaplar",
    icon: "📌",
    description: "Takip ettiğin kitap talepleri",
  },
  {
    title: "Eşleşmeler",
    href: "/eslesmeler",
    icon: "✨",
    description: "Akıllı kitap eşleşmeleri",
  },
  {
    title: "Takaslarım",
    href: "/takaslar",
    icon: "🤝",
    description: "Takas süreçlerini yönet",
  },
  {
    title: "Öğrenci Doğrulama",
    href: "/ogrenci-dogrulama",
    icon: "🎓",
    description: "Doğrulanmış öğrenci rozeti",
  },
  {
    title: "Paketler",
    href: "/paketler",
    icon: "💎",
    description: "KampüsRaf planlarını incele",
  },
];

const adminMenuItems: MenuItem[] = [
  {
    title: "Admin Paneli",
    href: "/admin",
    icon: "🛡️",
    description: "Genel platform yönetimi",
  },
  {
    title: "Kullanıcılar",
    href: "/admin/kullanicilar",
    icon: "👤",
    description: "Kullanıcı ve hesap yönetimi",
  },
  {
    title: "Şikayetler",
    href: "/admin/sikayetler",
    icon: "🚨",
    description: "Rapor ve şikayet inceleme",
  },
  {
    title: "Doğrulamalar",
    href: "/admin/dogrulamalar",
    icon: "✅",
    description: "Öğrenci doğrulama talepleri",
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function shouldHideMobileNav(pathname: string) {
  return hiddenPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function MobileBottomNav({ isAdmin: initialIsAdmin = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted && data?.role === "admin") {
          setIsAdmin(true);
        }
      } catch {
        // Mobil menü rol kontrolü başarısız olursa normal kullanıcı menüsü kalır.
      }
    }

    loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  if (shouldHideMobileNav(pathname)) {
    return null;
  }

  return (
    <>
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm md:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="absolute inset-x-3 bottom-24 max-h-[76vh] overflow-y-auto rounded-[2rem] bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  KampüsRaf
                </p>
                <h2 className="mt-1 text-xl font-black text-[#1F2933]">
                  Hızlı Menü
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF7F0] text-lg font-black text-slate-500"
              >
                ×
              </button>
            </div>

            <div className="mt-4">
              <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
                Sosyal
              </p>

              <div className="mt-2 grid gap-2">
                {socialMenuItems.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-[1.4rem] p-3 transition ${
                        active
                          ? "bg-[#2E7D5B] text-white"
                          : "bg-[#FAF7F0] text-[#1F2933] hover:bg-[#2E7D5B]/5"
                      }`}
                    >
                      <span className="text-2xl">{item.icon}</span>

                      <div className="min-w-0">
                        <p className="text-sm font-black">{item.title}</p>
                        {item.description && (
                          <p
                            className={`line-clamp-1 text-xs font-semibold ${
                              active ? "text-white/70" : "text-slate-500"
                            }`}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                Kitap & Takas
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {bookMenuItems.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-[1.4rem] p-3 transition ${
                        active
                          ? "bg-[#2E7D5B] text-white"
                          : "bg-[#FAF7F0] text-[#1F2933] hover:bg-[#2E7D5B]/5"
                      }`}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <p className="mt-2 text-sm font-black">{item.title}</p>
                    </Link>
                  );
                })}
              </div>
            </div>

            {isAdmin && (
              <div className="mt-5 rounded-[1.5rem] bg-[#F59E0B]/10 p-3">
                <p className="px-1 text-xs font-black uppercase tracking-[0.16em] text-[#B45309]">
                  Admin
                </p>

                <div className="mt-2 grid gap-2">
                  {adminMenuItems.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-[1.3rem] p-3 transition ${
                          active
                            ? "bg-[#F59E0B] text-white"
                            : "bg-white text-[#1F2933] hover:bg-[#F59E0B]/10"
                        }`}
                      >
                        <span className="text-xl">{item.icon}</span>

                        <div className="min-w-0">
                          <p className="text-sm font-black">{item.title}</p>
                          {item.description && (
                            <p
                              className={`line-clamp-1 text-xs font-semibold ${
                                active ? "text-white/70" : "text-slate-500"
                              }`}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2E7D5B]/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-14px_40px_rgba(31,41,51,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {mainItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            if (item.featured) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col items-center justify-end gap-1 pb-1"
                >
                  <span
                    className={`flex h-14 w-14 -translate-y-3 items-center justify-center rounded-[1.4rem] text-2xl shadow-xl transition ${
                      active
                        ? "bg-[#F59E0B] text-white shadow-[#F59E0B]/25"
                        : "bg-[#2E7D5B] text-white shadow-[#2E7D5B]/25 group-hover:-translate-y-4"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span
                    className={`-mt-2 text-[11px] font-black ${
                      active ? "text-[#F59E0B]" : "text-slate-500"
                    }`}
                  >
                    {item.title}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 transition ${
                  active
                    ? "text-[#2E7D5B]"
                    : "text-slate-400 hover:text-[#2E7D5B]"
                }`}
              >
                <span
                  className={`text-xl ${
                    active ? "scale-110" : "scale-100"
                  } transition`}
                >
                  {item.icon}
                </span>
                <span className="text-[11px] font-black">{item.title}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 transition ${
              isMenuOpen
                ? "text-[#2E7D5B]"
                : "text-slate-400 hover:text-[#2E7D5B]"
            }`}
          >
            <span className="text-xl">{isMenuOpen ? "×" : "☰"}</span>
            <span className="text-[11px] font-black">Menü</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default MobileBottomNav;