import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PageShortcuts } from "@/components/page-shortcuts";
import {
  createCommunityAction,
  joinCommunityAction,
  leaveCommunityAction,
} from "@/app/actions/communities";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  success?: string;
  error?: string;
  category?: string;
};

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  university: string | null;
  city: string | null;
  visibility: string;
  member_count: number | null;
  book_count: number | null;
  owner_id: string;
  created_at: string;
};

type CommunityMembership = {
  community_id: string;
  role: string;
  status: string;
};

const categoryOptions = [
  { value: "all", label: "Tümü" },
  { value: "okuma_grubu", label: "Okuma Grubu" },
  { value: "universite", label: "Üniversite" },
  { value: "kulup", label: "Kulüp" },
  { value: "ders", label: "Ders" },
  { value: "kampus", label: "Kampüs" },
  { value: "takas", label: "Takas" },
];

function getCategoryLabel(value?: string | null) {
  return categoryOptions.find((item) => item.value === value)?.label || "Topluluk";
}

function isMigrationError(error?: { code?: string; message?: string } | null) {
  if (!error) return false;

  const message = error.message?.toLocaleLowerCase("tr-TR") || "";

  return error.code === "42P01" || error.code === "42883" || message.includes("communities");
}

function getSuccessMessage(value?: string) {
  if (value === "created") return "Topluluk oluşturuldu ve kurucu olarak katıldın.";
  if (value === "joined") return "Topluluğa katıldın.";
  if (value === "left") return "Topluluktan ayrıldın.";
  return "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const selectedCategory = params.category || "all";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, university, city")
    .eq("id", user.id)
    .maybeSingle();

  let communitiesQuery = supabase
    .from("communities")
    .select(
      "id, slug, name, description, category, university, city, visibility, member_count, book_count, owner_id, created_at"
    )
    .eq("is_active", true)
    .order("member_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (selectedCategory !== "all") {
    communitiesQuery = communitiesQuery.eq("category", selectedCategory);
  }

  const { data: communitiesData, error: communitiesError } = await communitiesQuery;
  const needsMigration = isMigrationError(communitiesError);
  const communities = (communitiesData || []) as Community[];
  const communityIds = communities.map((community) => community.id);

  let memberships: CommunityMembership[] = [];

  if (communityIds.length > 0 && !needsMigration) {
    const { data } = await supabase
      .from("community_members")
      .select("community_id, role, status")
      .eq("user_id", user.id)
      .in("community_id", communityIds);

    memberships = (data || []) as CommunityMembership[];
  }

  const membershipByCommunity = new Map(
    memberships.map((membership) => [membership.community_id, membership])
  );
  const myCommunities = communities.filter((community) =>
    membershipByCommunity.has(community.id)
  );
  const totalMembers = communities.reduce(
    (total, community) => total + (community.member_count || 0),
    0
  );
  const successMessage = getSuccessMessage(params.success);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <AppHeader
        subtitle="Topluluklar"
        active="topluluklar"
        actions={
          <Link
            href="/paylas"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Paylaş
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-[#1F2933] text-white shadow-xl shadow-slate-900/10 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#2E7D5B]/40 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-[#F59E0B]/25 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Kampüs Toplulukları
                </p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                  Okuma grupları, kulüpler ve ortak raflar tek yerde.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 md:text-base">
                  Üniversitene, derslerine veya ilgi alanlarına göre topluluklara katıl;
                  yakınındaki kitapları, paylaşımları ve okuma çevreni büyüt.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-80">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{communities.length}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Topluluk</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{totalMembers}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Üye</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{myCommunities.length}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Benim</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {successMessage ? (
          <div className="mt-5 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B]">
            {successMessage}
          </div>
        ) : null}

        {params.error ? (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
            {params.error}
          </div>
        ) : null}

        {needsMigration ? (
          <section className="mt-6 rounded-[1.8rem] bg-white p-6 shadow-sm ring-1 ring-[#F59E0B]/20 md:rounded-[2rem]">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
              SQL gerekli
            </p>
            <h2 className="mt-2 text-2xl font-black">Topluluk altyapısı henüz kurulmamış.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Supabase SQL Editor içinde <span className="font-black">supabase-communities.sql</span> dosyasını çalıştır.
              Ardından bu sayfa toplulukları listelemeye başlayacak.
            </p>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="space-y-5">
              <div className="flex flex-wrap gap-2 rounded-[1.5rem] bg-white p-3 shadow-sm ring-1 ring-[#2E7D5B]/5">
                {categoryOptions.map((category) => {
                  const active = selectedCategory === category.value;

                  return (
                    <Link
                      key={category.value}
                      href={category.value === "all" ? "/topluluklar" : `/topluluklar?category=${category.value}`}
                      className={`rounded-full px-4 py-2 text-xs font-black transition ${
                        active
                          ? "bg-[#2E7D5B] text-white"
                          : "bg-[#FAF7F0] text-slate-600 hover:bg-[#2E7D5B]/5 hover:text-[#2E7D5B]"
                      }`}
                    >
                      {category.label}
                    </Link>
                  );
                })}
              </div>

              {communities.length === 0 ? (
                <section className="rounded-[1.8rem] bg-white p-8 text-center shadow-sm md:rounded-[2rem]">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                    İlk topluluk zamanı
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Bu kategoride topluluk yok.</h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Bir okuma grubu, bölüm topluluğu veya takas çevresi başlatarak ilk adımı atabilirsin.
                  </p>
                </section>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {communities.map((community) => {
                  const membership = membershipByCommunity.get(community.id);
                  const isMember = Boolean(membership);
                  const isOwner = membership?.role === "owner";

                  return (
                    <article
                      key={community.id}
                      className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]"
                    >
                      <div className="h-24 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.35),transparent_28%),linear-gradient(135deg,#2E7D5B,#1F2933)]" />

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#F59E0B]">
                              {getCategoryLabel(community.category)}
                            </p>
                            <h2 className="mt-2 line-clamp-2 text-xl font-black">
                              {community.name}
                            </h2>
                          </div>

                          <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-[11px] font-black text-slate-500">
                            {community.visibility === "private" ? "Özel" : "Açık"}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
                          {community.description || "Bu topluluk için henüz açıklama eklenmemiş."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black">
                          <span className="rounded-full bg-[#EAF5EF] px-3 py-1 text-[#2E7D5B]">
                            {community.member_count || 0} üye
                          </span>
                          {community.university ? (
                            <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-slate-500">
                              {community.university}
                            </span>
                          ) : null}
                          {community.city ? (
                            <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-slate-500">
                              {community.city}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-5 flex items-center gap-2">
                          {isMember ? (
                            <form action={leaveCommunityAction}>
                              <input type="hidden" name="communityId" value={community.id} />
                              <button
                                type="submit"
                                disabled={isOwner}
                                className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isOwner ? "Kurucusun" : "Ayrıl"}
                              </button>
                            </form>
                          ) : (
                            <form action={joinCommunityAction}>
                              <input type="hidden" name="communityId" value={community.id} />
                              <button
                                type="submit"
                                className="rounded-full bg-[#2E7D5B] px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                              >
                                Katıl
                              </button>
                            </form>
                          )}

                          <span className="ml-auto text-[11px] font-bold text-slate-400">
                            {formatDate(community.created_at)}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                  Topluluk Aç
                </p>
                <h2 className="mt-2 text-xl font-black">Kendi raf çevreni kur.</h2>

                <form action={createCommunityAction} className="mt-5 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-black text-slate-500">Ad</span>
                    <input
                      name="name"
                      required
                      minLength={3}
                      maxLength={80}
                      placeholder="Örn. ADÜ Edebiyat Rafı"
                      className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-black text-slate-500">Açıklama</span>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Topluluğun amacı, ilgi alanı veya takas düzeni..."
                      className="resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-black text-slate-500">Kategori</span>
                      <select
                        name="category"
                        defaultValue="okuma_grubu"
                        className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                      >
                        {categoryOptions.filter((item) => item.value !== "all").map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-xs font-black text-slate-500">Görünürlük</span>
                      <select
                        name="visibility"
                        defaultValue="public"
                        className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                      >
                        <option value="public">Açık</option>
                        <option value="private">Onaylı</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="university"
                      defaultValue={profile?.university || ""}
                      placeholder="Üniversite"
                      className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                    />
                    <input
                      name="city"
                      defaultValue={profile?.city || ""}
                      placeholder="Şehir"
                      className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-full bg-[#2E7D5B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                  >
                    Topluluğu Oluştur
                  </button>
                </form>
              </section>

              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                  Benim Topluluklarım
                </p>
                <div className="mt-4 grid gap-2">
                  {myCommunities.slice(0, 6).map((community) => (
                    <div
                      key={community.id}
                      className="rounded-2xl bg-[#FAF7F0] p-3"
                    >
                      <p className="line-clamp-1 text-sm font-black">{community.name}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {getCategoryLabel(community.category)} · {community.member_count || 0} üye
                      </p>
                    </div>
                  ))}
                  {myCommunities.length === 0 ? (
                    <p className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-bold leading-6 text-slate-500">
                      Henüz bir topluluğa katılmadın.
                    </p>
                  ) : null}
                </div>
              </section>

              <PageShortcuts
                eyebrow="Topluluk Bağlantıları"
                title="Sonraki adım"
                description="Topluluklar kitap ve sosyal keşifle birlikte çalışır."
                compact
                items={[
                  {
                    title: "Akış",
                    href: "/akis",
                    icon: "A",
                    description: "Topluluk paylaşımlarını takip et.",
                  },
                  {
                    title: "Harita",
                    href: "/harita",
                    icon: "H",
                    description: "Yakındaki açık rafları gör.",
                  },
                  {
                    title: "Kitap Ekle",
                    href: "/kitap-ekle",
                    icon: "+",
                    description: "Rafını topluluk için görünür yap.",
                    tone: "green",
                  },
                ]}
              />
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
