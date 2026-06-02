import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startMatchConversationAction } from "@/app/actions/conversations";
import { sendFriendRequestAction } from "@/app/actions/friends";

type ProfileSummary = {
  full_name: string | null;
  username: string | null;
  university: string | null;
  city: string | null;
  trust_score: number | null;
  verification_status: string | null;
  completed_exchange_count: number | null;
  response_score: number | null;
  gender: string | null;
  show_gender_on_profile: boolean | null;
};

type ScoreBreakdown = Record<string, unknown> | null;

type MatchItem = {
  id: string;
  request_id: string;
  user_book_id: string;
  requester_id: string;
  owner_id: string;
  match_score: number | null;
  match_level: string | null;
  match_reason: string | null;
  score_breakdown: ScoreBreakdown;
  status: string;
  created_at: string;
  last_scored_at: string | null;
  book_requests:
    | {
        title: string;
        author: string | null;
        category: string | null;
        city: string | null;
        university: string | null;
        note: string | null;
        status: string;
      }
    | {
        title: string;
        author: string | null;
        category: string | null;
        city: string | null;
        university: string | null;
        note: string | null;
        status: string;
      }[]
    | null;
  user_books:
    | {
        id: string;
        custom_title: string | null;
        custom_author: string | null;
        image_url: string | null;
        city: string | null;
        university: string | null;
        condition: string;
        exchange_type: string;
        books:
          | {
              title: string;
              author: string | null;
              category: string | null;
              cover_url: string | null;
            }
          | {
              title: string;
              author: string | null;
              category: string | null;
              cover_url: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        custom_title: string | null;
        custom_author: string | null;
        image_url: string | null;
        city: string | null;
        university: string | null;
        condition: string;
        exchange_type: string;
        books:
          | {
              title: string;
              author: string | null;
              category: string | null;
              cover_url: string | null;
            }
          | {
              title: string;
              author: string | null;
              category: string | null;
              cover_url: string | null;
            }[]
          | null;
      }[]
    | null;
  owner: ProfileSummary | ProfileSummary[] | null;
  requester: ProfileSummary | ProfileSummary[] | null;
};

type FriendshipSummary = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

type MatchesSearchParams = {
  level?: string;
  view?: string;
  status?: string;
};

const conditionLabels: Record<string, string> = {
  yeni: "Yeni",
  temiz: "Temiz",
  az_kullanilmis: "Az Kullanılmış",
  orta: "Orta",
  yipranmis: "Yıpranmış",
};

const exchangeTypeLabels: Record<string, string> = {
  takas: "Takas",
  odunc: "Ödünç",
  satis: "Satış",
  bagis: "Bağış",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  contacted: "İletişime geçildi",
  completed: "Tamamlandı",
  rejected: "Reddedildi",
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getScorePercent(score?: number | null) {
  const value = Number(score || 0);

  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(Math.round(value), 100));
}

function getMatchLevelMeta(level?: string | null) {
  if (level === "super") {
    return {
      emoji: "🔥",
      label: "Süper Eşleşme",
      description: "Kitap, konum, güven ve tercih sinyalleri çok güçlü.",
      badgeClass: "border-red-100 bg-red-50 text-red-700",
      softClass: "border-red-100 bg-red-50/60",
      barClass: "bg-red-500",
    };
  }

  if (level === "strong") {
    return {
      emoji: "⭐",
      label: "Güçlü Eşleşme",
      description: "Bu eşleşme yüksek uyum sinyalleri taşıyor.",
      badgeClass: "border-[#F59E0B]/20 bg-[#F59E0B]/10 text-[#B45309]",
      softClass: "border-[#F59E0B]/20 bg-[#F59E0B]/5",
      barClass: "bg-[#F59E0B]",
    };
  }

  if (level === "good") {
    return {
      emoji: "✅",
      label: "İyi Eşleşme",
      description: "Kitap bilgileri ve kullanıcı sinyalleri uyumlu.",
      badgeClass: "border-[#2E7D5B]/15 bg-[#2E7D5B]/10 text-[#2E7D5B]",
      softClass: "border-[#2E7D5B]/15 bg-[#2E7D5B]/5",
      barClass: "bg-[#2E7D5B]",
    };
  }

  return {
    emoji: "📌",
    label: "Normal Eşleşme",
    description: "Temel kitap benzerliği üzerinden oluşturuldu.",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-600",
    softClass: "border-slate-200 bg-slate-50",
    barClass: "bg-slate-400",
  };
}

function getGenderLabel(gender?: string | null) {
  if (gender === "male") return "Erkek";
  if (gender === "female") return "Kadın";
  return "Belirtilmemiş";
}

function getDisplayName(profile: ProfileSummary | null) {
  return profile?.full_name || profile?.username || "KampüsRaf kullanıcısı";
}

function getNumberFromBreakdown(breakdown: ScoreBreakdown, key: string) {
  const value = breakdown?.[key];
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) return 0;

  return numberValue;
}

function getSignalItems(breakdown: ScoreBreakdown) {
  const items = [
    {
      label: "Kitap uyumu",
      value:
        getNumberFromBreakdown(breakdown, "title_points") +
        getNumberFromBreakdown(breakdown, "author_points") +
        getNumberFromBreakdown(breakdown, "category_points"),
    },
    {
      label: "Konum",
      value:
        getNumberFromBreakdown(breakdown, "city_points") +
        getNumberFromBreakdown(breakdown, "university_points"),
    },
    {
      label: "Güven",
      value:
        getNumberFromBreakdown(breakdown, "trust_points") +
        getNumberFromBreakdown(breakdown, "verified_points") +
        getNumberFromBreakdown(breakdown, "exchange_points"),
    },
    {
      label: "Tercih",
      value: getNumberFromBreakdown(breakdown, "gender_points"),
    },
    {
      label: "Güncellik",
      value: getNumberFromBreakdown(breakdown, "recency_points"),
    },
  ];

  return items.filter((item) => item.value > 0);
}

function getFriendshipPairKey(userOneId: string, userTwoId: string) {
  return [userOneId, userTwoId].sort().join(":");
}

function getFriendshipViewState(
  friendship: FriendshipSummary | null,
  currentUserId: string
) {
  if (!friendship) {
    return {
      label: "Arkadaş Ekle",
      description: "Bu eşleşmedeki kullanıcıya arkadaşlık isteği gönder.",
      type: "send",
    };
  }

  if (friendship.status === "accepted") {
    return {
      label: "Arkadaşsınız",
      description: "Bu kullanıcı arkadaş listende.",
      type: "accepted",
    };
  }

  if (friendship.status === "pending") {
    if (friendship.requester_id === currentUserId) {
      return {
        label: "İstek Gönderildi",
        description: "Karşı tarafın isteğini kabul etmesi bekleniyor.",
        type: "outgoing",
      };
    }

    return {
      label: "İsteği Yanıtla",
      description: "Bu kullanıcı sana arkadaşlık isteği göndermiş.",
      type: "incoming",
    };
  }

  return {
    label: "Tekrar Arkadaş Ekle",
    description: "Daha önceki istek kapandı. Yeniden istek gönderebilirsin.",
    type: "send",
  };
}

function getSafeLevelFilter(value: string) {
  return ["super", "strong", "good", "normal"].includes(value) ? value : "";
}

function getSafeViewFilter(value: string) {
  return ["requester", "owner"].includes(value) ? value : "";
}

function getSafeStatusFilter(value: string) {
  return ["pending", "contacted", "completed", "rejected"].includes(value)
    ? value
    : "";
}

function buildMatchesHref({
  level,
  view,
  status,
}: {
  level?: string;
  view?: string;
  status?: string;
}) {
  const params = new URLSearchParams();

  if (level) params.set("level", level);
  if (view) params.set("view", view);
  if (status) params.set("status", status);

  const query = params.toString();

  return query ? `/eslesmeler?${query}` : "/eslesmeler";
}

function getFilterLinkClass(active: boolean) {
  return active
    ? "rounded-full bg-[#2E7D5B] px-4 py-2 text-xs font-black text-white shadow-sm"
    : "rounded-full border border-[#2E7D5B]/15 bg-white px-4 py-2 text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5";
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams?: Promise<MatchesSearchParams>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

    const params = (await searchParams) || {};

  const levelFilter = getSafeLevelFilter(params.level?.trim() || "");
  const viewFilter = getSafeViewFilter(params.view?.trim() || "");
  const statusFilter = getSafeStatusFilter(params.status?.trim() || "");

  const hasActiveFilter = Boolean(levelFilter || viewFilter || statusFilter);

    const currentPageHref = buildMatchesHref({
    level: levelFilter,
    view: viewFilter,
    status: statusFilter,
  });

  const { data, error } = await supabase
    .from("book_matches")
    .select(
      `
      id,
      request_id,
      user_book_id,
      requester_id,
      owner_id,
      match_score,
      match_level,
      match_reason,
      score_breakdown,
      status,
      created_at,
      last_scored_at,
      book_requests (
        title,
        author,
        category,
        city,
        university,
        note,
        status
      ),
      user_books (
        id,
        custom_title,
        custom_author,
        image_url,
        city,
        university,
        condition,
        exchange_type,
        books (
          title,
          author,
          category,
          cover_url
        )
      ),
      owner:profiles!book_matches_owner_id_fkey (
        full_name,
        username,
        university,
        city,
        trust_score,
        verification_status,
        completed_exchange_count,
        response_score,
        gender,
        show_gender_on_profile
      ),
      requester:profiles!book_matches_requester_id_fkey (
        full_name,
        username,
        university,
        city,
        trust_score,
        verification_status,
        completed_exchange_count,
        response_score,
        gender,
        show_gender_on_profile
      )
    `
    )
    .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
    .order("match_score", { ascending: false })
    .order("created_at", { ascending: false });

      const { data: friendshipData } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const friendships = (friendshipData || []) as FriendshipSummary[];

  const friendshipMap = new Map(
    friendships.map((friendship) => [
      getFriendshipPairKey(friendship.requester_id, friendship.addressee_id),
      friendship,
    ])
  );

    const allMatches = (data || []) as MatchItem[];

  const matches = allMatches.filter((match) => {
    const levelMatches = !levelFilter || match.match_level === levelFilter;

    const viewMatches =
      !viewFilter ||
      (viewFilter === "requester" && match.requester_id === user.id) ||
      (viewFilter === "owner" && match.owner_id === user.id);

    const statusMatches = !statusFilter || match.status === statusFilter;

    return levelMatches && viewMatches && statusMatches;
  });

  const superMatches = allMatches.filter(
    (match) => match.match_level === "super"
  );
  const strongMatches = allMatches.filter(
    (match) => match.match_level === "strong"
  );
  const goodMatches = allMatches.filter((match) => match.match_level === "good");

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📚
            </div>

            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Eşleşmeler
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/aradigim-kitaplar" className="hover:text-[#2E7D5B]">
              Aradığım Kitaplar
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
            <Link href="/takaslar" className="hover:text-[#2E7D5B]">
              Takaslar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
                Akıllı Eşleşme v2
              </p>

              <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
                En güçlü kitap eşleşmelerin.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                Kitap benzerliği, kampüs yakınlığı, güven puanı, doğrulama,
                aktiflik ve eşleşme tercihi birlikte analiz edilir.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-3xl bg-white/10 p-3">
                <p className="text-2xl font-black">{superMatches.length}</p>
                <p className="mt-1 text-[11px] font-black text-white/65">
                  Süper
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-3">
                <p className="text-2xl font-black">{strongMatches.length}</p>
                <p className="mt-1 text-[11px] font-black text-white/65">
                  Güçlü
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-3">
                <p className="text-2xl font-black">{goodMatches.length}</p>
                <p className="mt-1 text-[11px] font-black text-white/65">
                  İyi
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-4 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Toplam Eşleşme</p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {allMatches.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">
              Benim Aramalarıma Gelen
            </p>
            <p className="mt-3 text-4xl font-black text-[#F59E0B]">
              {allMatches.filter((match) => match.requester_id === user.id).length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">
              Benim Kitaplarımla Eşleşen
            </p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {allMatches.filter((match) => match.owner_id === user.id).length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">
              Yüksek Uyumlu
            </p>
            <p className="mt-3 text-4xl font-black text-red-600">
              {superMatches.length + strongMatches.length}
            </p>
          </div>
        </div>

                <div className="mt-5 rounded-[1.7rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black text-[#2E7D5B]">
                Eşleşmeleri Filtrele
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {matches.length} eşleşme gösteriliyor.
              </p>
            </div>

            {hasActiveFilter && (
              <Link
                href="/eslesmeler"
                className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-center text-xs font-black text-red-600 transition hover:-translate-y-0.5"
              >
                Filtreleri Temizle
              </Link>
            )}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Eşleşme Seviyesi
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={buildMatchesHref({
                    view: viewFilter,
                    status: statusFilter,
                  })}
                  className={getFilterLinkClass(!levelFilter)}
                >
                  Tümü
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: "super",
                    view: viewFilter,
                    status: statusFilter,
                  })}
                  className={getFilterLinkClass(levelFilter === "super")}
                >
                  🔥 Süper
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: "strong",
                    view: viewFilter,
                    status: statusFilter,
                  })}
                  className={getFilterLinkClass(levelFilter === "strong")}
                >
                  ⭐ Güçlü
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: "good",
                    view: viewFilter,
                    status: statusFilter,
                  })}
                  className={getFilterLinkClass(levelFilter === "good")}
                >
                  ✅ İyi
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: "normal",
                    view: viewFilter,
                    status: statusFilter,
                  })}
                  className={getFilterLinkClass(levelFilter === "normal")}
                >
                  📌 Normal
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Eşleşme Türü
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={buildMatchesHref({
                    level: levelFilter,
                    status: statusFilter,
                  })}
                  className={getFilterLinkClass(!viewFilter)}
                >
                  Tümü
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: levelFilter,
                    view: "requester",
                    status: statusFilter,
                  })}
                  className={getFilterLinkClass(viewFilter === "requester")}
                >
                  Aramalarıma Gelen
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: levelFilter,
                    view: "owner",
                    status: statusFilter,
                  })}
                  className={getFilterLinkClass(viewFilter === "owner")}
                >
                  Kitaplarımla Eşleşen
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Durum
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={buildMatchesHref({
                    level: levelFilter,
                    view: viewFilter,
                  })}
                  className={getFilterLinkClass(!statusFilter)}
                >
                  Tümü
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: levelFilter,
                    view: viewFilter,
                    status: "pending",
                  })}
                  className={getFilterLinkClass(statusFilter === "pending")}
                >
                  Bekleyen
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: levelFilter,
                    view: viewFilter,
                    status: "contacted",
                  })}
                  className={getFilterLinkClass(statusFilter === "contacted")}
                >
                  İletişime Geçilen
                </Link>

                <Link
                  href={buildMatchesHref({
                    level: levelFilter,
                    view: viewFilter,
                    status: "completed",
                  })}
                  className={getFilterLinkClass(statusFilter === "completed")}
                >
                  Tamamlanan
                </Link>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
            Eşleşmeler yüklenirken hata oluştu: {error.message}
          </div>
        )}

        {!error && matches.length === 0 ? (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-[#2E7D5B]/30 bg-white p-6 text-center shadow-sm md:mt-8 md:rounded-[2rem] md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              ✨
            </div>

            <h2 className="mt-5 text-2xl font-black">
  {hasActiveFilter ? "Bu filtrelerde eşleşme yok" : "Henüz eşleşme yok"}
</h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
  {hasActiveFilter
    ? "Seçtiğin filtrelerde eşleşme bulunamadı. Filtreleri temizleyerek tüm eşleşmeleri tekrar görüntüleyebilirsin."
    : "Bir kullanıcı aradığı kitabı kaydeder ve başka bir kullanıcı o kitaba benzer bir kitabı eklerse burada otomatik eşleşme oluşur."}
</p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/aradigim-kitaplar"
                className="rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-1"
              >
                Aradığım Kitap Ekle
              </Link>

              <Link
                href="/kitap-ekle"
                className="rounded-full border border-[#2E7D5B]/20 px-7 py-4 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1"
              >
                Kitap Ekle
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4 md:mt-8 md:space-y-5">
            {matches.map((match) => {
              const request = first(match.book_requests);
              const userBook = first(match.user_books);
              const relatedBook = first(userBook?.books ?? null);
              const owner = first(match.owner);
              const requester = first(match.requester);

              const isRequester = match.requester_id === user.id;

              const bookTitle =
                userBook?.custom_title ||
                relatedBook?.title ||
                "Kitap bilgisi yok";
              const bookAuthor =
                userBook?.custom_author ||
                relatedBook?.author ||
                "Yazar bilgisi yok";
              const image = userBook?.image_url || relatedBook?.cover_url || null;

                            const otherPerson = isRequester ? owner : requester;
              const otherPersonId = isRequester
                ? match.owner_id
                : match.requester_id;

              const friendship =
                friendshipMap.get(getFriendshipPairKey(user.id, otherPersonId)) ||
                null;

              const friendshipState = getFriendshipViewState(
                friendship,
                user.id
              );

              const levelMeta = getMatchLevelMeta(match.match_level);
              const score = getScorePercent(match.match_score);
              const signalItems = getSignalItems(match.score_breakdown);

              return (
                <article
                  key={match.id}
                  className={`overflow-hidden rounded-[1.7rem] border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem] ${levelMeta.softClass}`}
                >
                  <div className="grid gap-4 p-4 md:gap-6 md:p-6 lg:grid-cols-[0.72fr_1.28fr]">
                    <div className="flex gap-3 md:gap-4">
                      <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-3xl md:h-36 md:w-28">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt={bookTitle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "📖"
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${levelMeta.badgeClass}`}
                          >
                            {levelMeta.emoji} {levelMeta.label}
                          </span>

                          <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                            %{score} uyum
                          </span>
                        </div>

                        <h2 className="mt-3 line-clamp-2 text-lg font-black leading-tight text-[#1F2933] md:mt-4 md:text-2xl">
                          {bookTitle}
                        </h2>

                        <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
                          {bookAuthor}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {userBook?.exchange_type && (
                            <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                              {exchangeTypeLabels[userBook.exchange_type] ||
                                userBook.exchange_type}
                            </span>
                          )}

                          {userBook?.condition && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                              {conditionLabels[userBook.condition] ||
                                userBook.condition}
                            </span>
                          )}

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {statusLabels[match.status] || match.status}
                          </span>
                        </div>

                        <div className="mt-4">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${levelMeta.barClass}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-400">
                            Son skor: {formatDate(match.last_scored_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="rounded-2xl bg-[#FAF7F0] p-4 md:p-5">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          {isRequester
                            ? "Aradığın kitapla eşleşti"
                            : "Senin kitabın bir aramayla eşleşti"}
                        </p>

                        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-tight md:text-xl">
                          {request?.title || "Arama kaydı"}
                        </h3>

                        {request?.author && (
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {request.author}
                          </p>
                        )}

                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            Eşleşme Sebebi
                          </p>

                          <p className="mt-2 text-sm font-black leading-6 text-[#1F2933]">
                            {match.match_reason || levelMeta.description}
                          </p>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            Karşı taraf
                          </p>

                          <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                            {getDisplayName(otherPerson)}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {otherPerson?.university || "Üniversite bilgisi yok"}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {otherPerson?.city || "Şehir bilgisi yok"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {otherPerson?.verification_status === "verified" && (
                              <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                                🎓 Doğrulanmış
                              </span>
                            )}

                            {(otherPerson?.trust_score || 0) > 0 && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                Güven: {otherPerson?.trust_score}
                              </span>
                            )}

                            {(otherPerson?.completed_exchange_count || 0) > 0 && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                {otherPerson?.completed_exchange_count} takas
                              </span>
                            )}

                            {otherPerson?.show_gender_on_profile && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                {getGenderLabel(otherPerson.gender)}
                              </span>
                            )}

                                                        {friendshipState.type === "accepted" && (
                              <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                                Arkadaşın
                              </span>
                            )}

                            {friendshipState.type === "outgoing" && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                İstek gönderildi
                              </span>
                            )}

                            {friendshipState.type === "incoming" && (
                              <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                                Gelen arkadaşlık isteği
                              </span>
                            )}
                          </div>
                        </div>

                        {signalItems.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {signalItems.map((item) => (
                              <span
                                key={item.label}
                                className="rounded-full border border-[#2E7D5B]/10 bg-white px-3 py-1 text-xs font-black text-slate-600"
                              >
                                {item.label} +{Math.round(item.value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                                            <div className="mt-4 grid gap-2 sm:flex sm:flex-row sm:flex-wrap md:mt-5 md:gap-3">
                        <Link
                          href={`/kitaplar/${match.user_book_id}`}
                          className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 sm:w-auto"
                        >
                          Kitabı Gör
                        </Link>

                        <form
                          action={startMatchConversationAction}
                          className="w-full sm:w-auto"
                        >
                          <input type="hidden" name="matchId" value={match.id} />
                          <button
                            type="submit"
                            className="w-full rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                          >
                            Mesaj Gönder
                          </button>
                        </form>

                        {friendshipState.type === "accepted" ? (
                          <Link
                            href="/arkadaslar"
                            className="w-full rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/10 px-5 py-3 text-center text-sm font-black text-[#B45309] transition hover:-translate-y-0.5 sm:w-auto"
                          >
                            Arkadaşsınız
                          </Link>
                        ) : friendshipState.type === "incoming" ? (
                          <Link
                            href="/arkadaslar"
                            className="w-full rounded-full bg-[#F59E0B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 sm:w-auto"
                          >
                            İsteği Yanıtla
                          </Link>
                        ) : (
                          <form
                            action={sendFriendRequestAction}
                            className="w-full sm:w-auto"
                          >
                            <input
                              type="hidden"
                              name="addresseeId"
                              value={otherPersonId}
                            />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={currentPageHref}
                            />

                            <button
                              type="submit"
                              disabled={friendshipState.type === "outgoing"}
                              className="w-full rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                              {friendshipState.label}
                            </button>
                          </form>
                        )}
                      </div>

                      <p className="mt-3 text-xs font-semibold text-slate-400">
                        {friendshipState.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}