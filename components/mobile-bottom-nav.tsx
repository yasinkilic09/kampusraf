"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ShortcutItem = {
  title: string;
  href: string;
  icon: string;
  description?: string;
  tone?: "green" | "amber" | "light";
};

type ShortcutGroup = {
  title: string;
  description: string;
  items: ShortcutItem[];
};

const hiddenPathPrefixes = ["/auth", "/tanitim", "/hesap-kisitlandi"];

const primaryTabs: ShortcutItem[] = [
  {
    title: "Panel",
    href: "/dashboard",
    icon: "P",
  },
  {
    title: "Akış",
    href: "/akis",
    icon: "A",
  },
  {
    title: "Paylaş",
    href: "/paylas",
    icon: "+",
    tone: "amber",
  },
  {
    title: "Ara",
    href: "/kitap-ara",
    icon: "A",
  },
];

const quickActions: ShortcutItem[] = [
  {
    title: "Rafım",
    href: "/kitaplarim",
    icon: "R",
    description: "Sanal kitaplığın",
    tone: "green",
  },
  {
    title: "Kitap Ekle",
    href: "/kitap-ekle",
    icon: "+",
    description: "Rafa yeni kitap",
    tone: "green",
  },
  {
    title: "Kitap Ara",
    href: "/kitap-ara",
    icon: "B",
    description: "Kampüste bul",
    tone: "light",
  },
  {
    title: "Harita",
    href: "/harita",
    icon: "H",
    description: "Yakındaki raflar",
    tone: "green",
  },
  {
    title: "Rastgele Raf",
    href: "/rastgele-raf",
    icon: "Z",
    description: "Alıntı keşfi",
    tone: "amber",
  },
  {
    title: "Kelime Sözlüğü",
    href: "/kelime-sozlugu",
    icon: "K",
    description: "Günün kelimesi",
    tone: "light",
  },
  {
    title: "Topluluklar",
    href: "/topluluklar",
    icon: "T",
    description: "Okuma grupları",
    tone: "green",
  },
  {
    title: "Mesajlar",
    href: "/mesajlar",
    icon: "M",
    description: "Sohbetler",
    tone: "light",
  },
];

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Sosyal",
    description: "Akış, çevre ve bildirimler",
    items: [
      {
        title: "Akış",
        href: "/akis",
        icon: "A",
        description: "Topluluk ve arkadaş paylaşımları",
      },
      {
        title: "Paylaş",
        href: "/paylas",
        icon: "+",
        description: "Fotoğraf ve kitap etiketi",
      },
      {
        title: "Topluluklar",
        href: "/topluluklar",
        icon: "T",
        description: "Okuma grupları ve kampüs rafları",
      },
      {
        title: "Arkadaşlar",
        href: "/arkadaslar",
        icon: "K",
        description: "İstekler ve sosyal çevre",
      },
      {
        title: "Bildirimler",
        href: "/bildirimler",
        icon: "B",
        description: "Yeni gelişmeler",
      },
    ],
  },
  {
    title: "Kitaplık",
    description: "Rafını kur ve kitapları bul",
    items: [
      {
        title: "Rafım",
        href: "/kitaplarim",
        icon: "R",
        description: "Sanal kütüphanen",
      },
      {
        title: "Kitap Ekle",
        href: "/kitap-ekle",
        icon: "+",
        description: "Katalogdan veya manuel ekle",
      },
      {
        title: "Kitap Ara",
        href: "/kitap-ara",
        icon: "B",
        description: "Kampüs raflarında ara",
      },
      {
        title: "Harita",
        href: "/harita",
        icon: "H",
        description: "Yakındaki açık kitaplar",
      },
      {
        title: "Aradığım",
        href: "/aradigim-kitaplar",
        icon: "T",
        description: "Takip ettiğin talepler",
      },
    ],
  },
  {
    title: "Keşif ve Takas",
    description: "Alıntı, ses ve eşleşmeler",
    items: [
      {
        title: "Rastgele Raf",
        href: "/rastgele-raf",
        icon: "Z",
        description: "Zar at, alıntı keşfet",
      },
      {
        title: "Kelime Sözlüğü",
        href: "/kelime-sozlugu",
        icon: "K",
        description: "Her gün yeni kelime ve anlamı",
      },
      {
        title: "Favoriler",
        href: "/favori-alintilarim",
        icon: "F",
        description: "Kaydedilen alıntılar",
      },
      {
        title: "Sesli Raf",
        href: "/sesli-raf",
        icon: "S",
        description: "Sesli kitap ve metinler",
      },
      {
        title: "Eşleşmeler",
        href: "/eslesmeler",
        icon: "E",
        description: "Akıllı kitap fırsatları",
      },
      {
        title: "Takaslarım",
        href: "/takaslar",
        icon: "T",
        description: "Takas süreçleri",
      },
    ],
  },
  {
    title: "Hesap",
    description: "Profil, doğrulama ve paket",
    items: [
      {
        title: "Profilim",
        href: "/profilim",
        icon: "P",
        description: "Profil ve sosyal görünürlük",
      },
      {
        title: "Doğrulama",
        href: "/ogrenci-dogrulama",
        icon: "D",
        description: "Öğrenci rozeti",
      },
      {
        title: "Paketler",
        href: "/paketler",
        icon: "U",
        description: "Üyelik planları",
      },
    ],
  },
];

const adminMenuItems: ShortcutItem[] = [
  {
    title: "Admin Paneli",
    href: "/admin",
    icon: "Y",
    description: "Genel yönetim",
  },
  {
    title: "Kullanıcılar",
    href: "/admin/kullanicilar",
    icon: "K",
    description: "Hesap ve rol yönetimi",
  },
  {
    title: "Doğrulamalar",
    href: "/admin/dogrulamalar",
    icon: "D",
    description: "Öğrenci onayları",
  },
  {
    title: "Şikayetler",
    href: "/admin/sikayetler",
    icon: "G",
    description: "Güvenlik incelemeleri",
  },
  {
    title: "Alıntılar",
    href: "/admin/alintilar",
    icon: "A",
    description: "Rastgele Raf havuzu",
  },
  {
    title: "Kelimeler",
    href: "/admin/kelimeler",
    icon: "K",
    description: "Günün kelime havuzu",
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

function getToneClass(tone?: ShortcutItem["tone"], isActive = false) {
  if (isActive) return "bg-[#2E7D5B] text-white ring-[#2E7D5B]";
  if (tone === "amber") return "bg-[#FFF7E6] text-[#B45309] ring-[#F59E0B]/20";
  if (tone === "green") return "bg-[#EAF5EF] text-[#2E7D5B] ring-[#2E7D5B]/15";
  return "bg-[#FAF7F0] text-[#1F2933] ring-[#2E7D5B]/8";
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRoleLoaded, setAdminRoleLoaded] = useState(false);
  const isMenuOpen = openMenuPath === pathname;

  useEffect(() => {
    if (!isMenuOpen || adminRoleLoaded) return;

    let isMounted = true;

    async function loadRole() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setAdminRoleLoaded(true);
          }
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted) {
          setIsAdmin(data?.role === "admin");
          setAdminRoleLoaded(true);
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
          setAdminRoleLoaded(true);
        }
      }
    }

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [adminRoleLoaded, isMenuOpen]);

  const activeTab = useMemo(
    () => primaryTabs.find((item) => isActivePath(pathname, item.href)),
    [pathname]
  );

  if (shouldHideMobileNav(pathname)) {
    return null;
  }

  return (
    <>
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#1F2933]/35 backdrop-blur-sm md:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpenMenuPath(null)}
          />

          <section className="absolute inset-x-3 bottom-[6.4rem] max-h-[74vh] overflow-hidden rounded-[1.6rem] bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-[#2E7D5B]/10">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] ring-1 ring-[#2E7D5B]/10">
                  <Image
                    src="/logo-symbol.png"
                    alt="KampüsRaf logo"
                    width={44}
                    height={44}
                    className="h-10 w-10 object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                    Kısayollar
                  </p>
                  <h2 className="truncate text-lg font-black text-[#1F2933]">
                    Ne yapmak istiyorsun?
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpenMenuPath(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF7F0] text-lg font-black text-slate-500 transition hover:bg-[#2E7D5B]/10 hover:text-[#2E7D5B]"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(74vh-5rem)] overflow-y-auto px-4 pb-5 pt-4">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`rounded-[1.25rem] p-3 ring-1 transition hover:-translate-y-0.5 ${getToneClass(
                        item.tone,
                        active
                      )}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/75 text-sm font-black shadow-sm">
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="truncate text-[11px] font-bold opacity-70">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3">
                {shortcutGroups.map((group) => (
                  <section
                    key={group.title}
                    className="rounded-[1.35rem] bg-[#FAF7F0] p-3"
                  >
                    <div className="flex items-end justify-between gap-3 px-1">
                      <div>
                        <h3 className="text-sm font-black text-[#1F2933]">
                          {group.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                          {group.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {group.items.map((item) => {
                        const active = isActivePath(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            className={`flex items-center gap-3 rounded-[1.1rem] p-3 ring-1 transition hover:-translate-y-0.5 ${
                              active
                                ? "bg-[#2E7D5B] text-white ring-[#2E7D5B]"
                                : "bg-white text-[#1F2933] ring-slate-100 hover:ring-[#2E7D5B]/20"
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                                active
                                  ? "bg-white/15 text-white"
                                  : "bg-[#FAF7F0] text-[#2E7D5B]"
                              }`}
                            >
                              {item.icon}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">
                                {item.title}
                              </p>
                              {item.description && (
                                <p
                                  className={`truncate text-[11px] font-bold ${
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
                  </section>
                ))}
              </div>

              {isAdmin && (
                <section className="mt-4 rounded-[1.35rem] bg-[#FFF7E6] p-3">
                  <div className="px-1">
                    <h3 className="text-sm font-black text-[#B45309]">
                      Admin
                    </h3>
                    <p className="mt-0.5 text-[11px] font-bold text-[#92400E]">
                      Yönetim kısayolları
                    </p>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {adminMenuItems.map((item) => {
                      const active = isActivePath(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          className={`flex items-center gap-3 rounded-[1.1rem] p-3 ring-1 transition hover:-translate-y-0.5 ${
                            active
                              ? "bg-[#F59E0B] text-white ring-[#F59E0B]"
                              : "bg-white text-[#1F2933] ring-[#F59E0B]/10"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF7E6] text-sm font-black text-[#B45309]">
                            {item.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">
                              {item.title}
                            </p>
                            <p
                              className={`truncate text-[11px] font-bold ${
                                active ? "text-white/75" : "text-slate-500"
                              }`}
                            >
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1 rounded-[1.55rem] border border-[#2E7D5B]/10 bg-white/94 p-1.5 shadow-[0_-10px_36px_rgba(31,41,51,0.12)] backdrop-blur-xl">
          {primaryTabs.map((item) => {
            const active = isActivePath(pathname, item.href);
            const isShare = item.href === "/paylas";

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-1 py-2 transition ${
                  active
                    ? "bg-[#EAF5EF] text-[#2E7D5B]"
                    : "text-slate-500 hover:bg-[#FAF7F0] hover:text-[#2E7D5B]"
                } ${
                  isShare
                    ? active
                      ? "bg-[#F59E0B] text-white"
                      : "bg-[#2E7D5B] text-white shadow-lg shadow-[#2E7D5B]/15 hover:bg-[#25684c] hover:text-white"
                    : ""
                }`}
              >
                <span
                  className={`flex h-7 min-w-7 items-center justify-center rounded-full text-sm font-black ${
                    active && !isShare ? "bg-white" : "bg-white/15"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate text-[10.5px] font-black">
                  {item.title}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpenMenuPath(isMenuOpen ? null : pathname)}
            aria-expanded={isMenuOpen}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-1 py-2 transition ${
              isMenuOpen || !activeTab
                ? "bg-[#EAF5EF] text-[#2E7D5B]"
                : "text-slate-500 hover:bg-[#FAF7F0] hover:text-[#2E7D5B]"
            }`}
          >
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white text-sm font-black">
              {isMenuOpen ? "×" : "M"}
            </span>
            <span className="truncate text-[10.5px] font-black">Menü</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default MobileBottomNav;
