import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export type AppHeaderNavItem = {
  href: string;
  label: string;
  key: string;
};

type AppHeaderNavGroup = {
  key: string;
  label: string;
  description: string;
  itemKeys: string[];
};

type AppHeaderProps = {
  subtitle: string;
  active?: string;
  isAdmin?: boolean;
  navItems?: AppHeaderNavItem[];
  showSearch?: boolean;
  actions?: ReactNode;
};

export const appNavItems: AppHeaderNavItem[] = [
  { key: "panel", href: "/dashboard", label: "Panel" },
  { key: "akis", href: "/akis", label: "Akış" },
  { key: "topluluklar", href: "/topluluklar", label: "Topluluklar" },
  { key: "paylas", href: "/paylas", label: "Paylaş" },
  { key: "kitap-ara", href: "/kitap-ara", label: "Kitap Ara" },
  { key: "harita", href: "/harita", label: "Harita" },
  { key: "kitap-ekle", href: "/kitap-ekle", label: "Kitap Ekle" },
  { key: "aradigim-kitaplar", href: "/aradigim-kitaplar", label: "Aradığım" },
  { key: "kitaplarim", href: "/kitaplarim", label: "Rafım" },
  { key: "mesajlar", href: "/mesajlar", label: "Mesajlar" },
  { key: "eslesmeler", href: "/eslesmeler", label: "Eşleşmeler" },
  { key: "takaslar", href: "/takaslar", label: "Takaslar" },
  { key: "arkadaslar", href: "/arkadaslar", label: "Arkadaşlar" },
  { key: "bildirimler", href: "/bildirimler", label: "Bildirimler" },
  { key: "rastgele-raf", href: "/rastgele-raf", label: "Rastgele Raf" },
  { key: "kelime-sozlugu", href: "/kelime-sozlugu", label: "Kelime Sözlüğü" },
  { key: "favori-alintilarim", href: "/favori-alintilarim", label: "Favori Alıntılar" },
  { key: "sesli-raf", href: "/sesli-raf", label: "Sesli Raf" },
  { key: "ogrenci-dogrulama", href: "/ogrenci-dogrulama", label: "Öğrenci Doğrulama" },
  { key: "paketler", href: "/paketler", label: "Paketler" },
  { key: "profilim", href: "/profilim", label: "Profilim" },
];

export const adminNavItems: AppHeaderNavItem[] = [
  { key: "admin", href: "/admin", label: "Admin" },
  { key: "admin-dogrulamalar", href: "/admin/dogrulamalar", label: "Doğrulamalar" },
  { key: "admin-kullanicilar", href: "/admin/kullanicilar", label: "Kullanıcılar" },
  { key: "admin-sikayetler", href: "/admin/sikayetler", label: "Şikayetler" },
  { key: "admin-alintilar", href: "/admin/alintilar", label: "Alıntılar" },
  { key: "admin-kelimeler", href: "/admin/kelimeler", label: "Kelimeler" },
  { key: "admin-sesli-raf", href: "/admin/sesli-raf", label: "Sesli Raf" },
  { key: "panel", href: "/dashboard", label: "Panel" },
];

const appNavGroups: AppHeaderNavGroup[] = [
  {
    key: "home",
    label: "Ana",
    description: "Günlük merkez",
    itemKeys: ["panel", "akis", "paylas"],
  },
  {
    key: "library",
    label: "Kitaplık",
    description: "Raf, arama ve ekleme",
    itemKeys: [
      "kitaplarim",
      "kitap-ara",
      "harita",
      "kitap-ekle",
      "aradigim-kitaplar",
    ],
  },
  {
    key: "exchange",
    label: "Takas",
    description: "Eşleşme ve süreçler",
    itemKeys: ["eslesmeler", "takaslar"],
  },
  {
    key: "discover",
    label: "Keşif",
    description: "Alıntı, kelime ve sesli raf",
    itemKeys: ["rastgele-raf", "kelime-sozlugu", "favori-alintilarim", "sesli-raf"],
  },
  {
    key: "social",
    label: "Sosyal",
    description: "İletişim ve çevre",
    itemKeys: ["topluluklar", "mesajlar", "arkadaslar", "bildirimler"],
  },
  {
    key: "account",
    label: "Hesap",
    description: "Profil ve üyelik",
    itemKeys: ["profilim", "ogrenci-dogrulama", "paketler"],
  },
];

const adminNavGroups: AppHeaderNavGroup[] = [
  {
    key: "admin-main",
    label: "Yönetim",
    description: "Genel kontrol",
    itemKeys: ["admin", "admin-kullanicilar", "admin-dogrulamalar"],
  },
  {
    key: "admin-content",
    label: "İçerik",
    description: "Alıntı, kelime ve ses",
    itemKeys: ["admin-alintilar", "admin-kelimeler", "admin-sesli-raf"],
  },
  {
    key: "admin-safety",
    label: "Güvenlik",
    description: "Şikayet ve panel",
    itemKeys: ["admin-sikayetler", "panel"],
  },
];

function getGroupNavClass(isActive: boolean) {
  return [
    "flex items-center gap-2 rounded-full px-3 py-2 transition",
    isActive
      ? "bg-white text-[#2E7D5B] shadow-sm"
      : "text-slate-600 hover:bg-white hover:text-[#2E7D5B]",
  ].join(" ");
}

function getPrimaryNavClass(isActive: boolean, isCreateAction: boolean) {
  return [
    "rounded-full px-3.5 py-2 transition",
    isCreateAction
      ? "bg-[#2E7D5B] text-white shadow-sm hover:bg-[#25684c]"
      : isActive
        ? "bg-white text-[#2E7D5B] shadow-sm"
        : "text-slate-600 hover:bg-white hover:text-[#2E7D5B]",
  ].join(" ");
}

function getNavItemClass(isActive: boolean) {
  return [
    "block rounded-2xl px-3 py-2 transition",
    isActive
      ? "bg-[#2E7D5B] text-white"
      : "text-[#1F2933] hover:bg-[#2E7D5B]/5 hover:text-[#2E7D5B]",
  ].join(" ");
}

function buildNavGroups(navItems: AppHeaderNavItem[], isAdmin: boolean) {
  const baseGroups = isAdmin ? adminNavGroups : appNavGroups;
  const usedKeys = new Set<string>();
  const safeNavItems = isAdmin
    ? navItems
    : navItems.filter(
        (item) => !item.key.startsWith("admin") && !item.href.startsWith("/admin")
      );
  const itemMap = new Map(safeNavItems.map((item) => [item.key, item]));

  const groups = baseGroups
    .map((group) => {
      const items = group.itemKeys
        .map((key) => itemMap.get(key))
        .filter((item): item is AppHeaderNavItem => Boolean(item));

      items.forEach((item) => usedKeys.add(item.key));

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  const remainingItems = safeNavItems.filter((item) => !usedKeys.has(item.key));

  if (remainingItems.length > 0) {
    groups.push({
      key: "other",
      label: "Diğer",
      description: "Ek bağlantılar",
      itemKeys: [],
      items: remainingItems,
    });
  }

  return groups;
}

export function AppHeader({
  subtitle,
  active,
  isAdmin = false,
  navItems = appNavItems,
  showSearch = true,
  actions,
}: AppHeaderProps) {
  const hasAdminItem = navItems.some((item) => item.key === "admin");
  const primaryNavKeys = new Set(
    isAdmin
      ? ["admin", "admin-kullanicilar", "admin-dogrulamalar", "panel"]
      : ["panel", "akis", "paylas", "kitap-ara", "kitaplarim"]
  );
  const primaryNavItems = navItems.filter((item) => primaryNavKeys.has(item.key));
  const secondaryNavItems = navItems.filter(
    (item) => !primaryNavKeys.has(item.key)
  );
  const headerGroups = buildNavGroups(secondaryNavItems, isAdmin);

  return (
    <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/90 px-4 py-3 shadow-sm shadow-slate-900/[0.03] backdrop-blur-xl md:px-6 md:py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/dashboard" className="group flex min-w-0 items-center gap-3">
          <BrandMark />

          <div className="min-w-0">
            <p className="truncate text-xl font-black tracking-tight transition group-hover:text-[#2E7D5B]">
              Kampüs<span className="text-[#F59E0B]">Raf</span>
            </p>
            <p className="truncate text-xs font-semibold text-slate-500">{subtitle}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 text-sm font-black lg:flex">
          <div className="flex items-center gap-1 rounded-full bg-[#FAF7F0] p-1 ring-1 ring-[#2E7D5B]/8">
            {primaryNavItems.map((item) => {
              const isCreateAction = item.key === "paylas";

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch={false}
                  className={getPrimaryNavClass(
                    active === item.key,
                    isCreateAction
                  )}
                  aria-current={active === item.key ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {headerGroups.map((group) => {
            const groupActive = group.items.some((item) => active === item.key);

            return (
              <div key={group.key} className="group relative">
                <button
                  type="button"
                  className={getGroupNavClass(groupActive)}
                  aria-haspopup="true"
                >
                  <span>{group.label}</span>
                  <span className="text-[10px]">⌄</span>
                </button>

                <div className="invisible absolute left-0 top-full z-40 mt-2 w-64 translate-y-1 rounded-[1.4rem] border border-[#2E7D5B]/10 bg-white p-2 opacity-0 shadow-2xl shadow-slate-900/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <div className="px-3 pb-2 pt-1">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                      {group.label}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {group.description}
                    </p>
                  </div>

                  <div className="grid gap-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        prefetch={false}
                        className={getNavItemClass(active === item.key)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {isAdmin && !hasAdminItem ? (
            <Link
              href="/admin"
              prefetch={false}
              className={getGroupNavClass(active === "admin")}
            >
              Admin
            </Link>
          ) : null}
        </nav>

        {showSearch ? (
          <form
            action="/kitap-ara"
            className="hidden min-w-[210px] max-w-[280px] flex-1 items-center gap-2 rounded-full border border-[#2E7D5B]/10 bg-[#FAF7F0] px-3 py-2 lg:flex xl:max-w-[230px] 2xl:max-w-[280px]"
          >
            <input
              name="q"
              type="search"
              placeholder="Kitap ara"
              aria-label="Kitap ara"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#1F2933] outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="rounded-full bg-[#2E7D5B] px-3 py-1.5 text-xs font-black text-white transition hover:bg-[#25684c]"
            >
              Ara
            </button>
          </form>
        ) : null}

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
