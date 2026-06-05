import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

type SearchParams = {
  q?: string;
  city?: string;
  university?: string;
  exchange_type?: string;
  condition?: string;
  only_available?: string;
  sort?: string;
};

type SmartBookResult = {
  id: string;
  user_id: string;
  book_id: string;
  book_title: string;
  book_author: string | null;
  book_category: string | null;
  book_cover_url: string | null;
  custom_title: string | null;
  custom_author: string | null;
  image_url: string | null;
  note: string | null;
  city: string | null;
  university: string | null;
  book_condition: string;
  exchange_type: string;
  status: string;
  owner_full_name: string | null;
  owner_username: string | null;
  owner_university: string | null;
  owner_city: string | null;
  owner_gender: string | null;
  owner_show_gender_on_profile: boolean | null;
  trust_score: number | null;
  created_at: string;
  owner_count: number;
  search_score: number;
};

type SearchSuggestion = {
  label: string;
  value: string;
  suggestion_type: string;
  result_count: number;
  similarity_score: number;
};

type UserProfile = {
  plan_type: string | null;
  city: string | null;
  university: string | null;
  gender: string | null;
  match_gender_preference: string | null;
};

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getPlanLabel(planType?: string | null) {
  if (planType === "plus") return "Plus";
  if (planType === "premium") return "Premium";
  if (planType === "pro") return "Pro";
  return "Free";
}

function isPlusOrHigher(planType?: string | null) {
  return planType === "plus" || planType === "premium" || planType === "pro";
}

function isPremiumOrHigher(planType?: string | null) {
  return planType === "premium" || planType === "pro";
}

function isPro(planType?: string | null) {
  return planType === "pro";
}

function getGenderLabel(gender?: string | null) {
  if (gender === "male") return "Erkek";
  if (gender === "female") return "Kadın";
  return "Belirtilmemiş";
}

function getPreferenceLabel(preference?: string | null) {
  if (preference === "male") return "Erkek kullanıcılar";
  if (preference === "female") return "Kadın kullanıcılar";
  return "Herkes";
}

function getSafeExchangeType(value: string) {
  return ["takas", "odunc", "satis", "bagis"].includes(value) ? value : "";
}

function getSafeCondition(value: string) {
  return ["yeni", "temiz", "az_kullanilmis", "orta", "yipranmis"].includes(
    value
  )
    ? value
    : "";
}

function getSafeSort(value: string) {
  return ["smart", "newest", "trust", "popular"].includes(value)
    ? value
    : "smart";
}

function buildSearchHref({
  q,
  city,
  university,
  exchangeType,
  condition,
  sort,
}: {
  q?: string;
  city?: string;
  university?: string;
  exchangeType?: string;
  condition?: string;
  sort?: string;
}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (city) params.set("city", city);
  if (university) params.set("university", university);
  if (exchangeType) params.set("exchange_type", exchangeType);
  if (condition) params.set("condition", condition);
  if (sort && sort !== "smart") params.set("sort", sort);

  const query = params.toString();

  return query ? `/kitap-ara?${query}` : "/kitap-ara";
}

function getMatchChance({
  book,
  profile,
}: {
  book: SmartBookResult;
  profile: UserProfile | null;
}) {
  let score = 45;

  if (
    profile?.city &&
    book.owner_city &&
    normalizeText(profile.city) === normalizeText(book.owner_city)
  ) {
    score += 12;
  }

  if (
    profile?.university &&
    book.owner_university &&
    normalizeText(profile.university) === normalizeText(book.owner_university)
  ) {
    score += 18;
  }

  if ((book.trust_score || 0) >= 80) score += 10;
  else if ((book.trust_score || 0) >= 60) score += 6;

  if (book.status === "mevcut") score += 8;

  if (book.owner_count >= 3) score += 5;

  if (
    profile?.match_gender_preference &&
    profile.match_gender_preference !== "everyone" &&
    book.owner_gender === profile.match_gender_preference
  ) {
    score += 7;
  }

  return Math.min(score, 98);
}

function LockedFeatureCard({
  title,
  description,
  requiredPlan,
}: {
  title: string;
  description: string;
  requiredPlan: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F59E0B]/15 text-lg">
          🔒
        </div>

        <div>
          <p className="text-sm font-black text-[#1F2933]">{title}</p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>

          <Link
            href="/paketler"
            className="mt-3 inline-flex rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5"
          >
            {requiredPlan} Pakete Geç
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function SearchBooksPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("plan_type, city, university, gender, match_gender_preference")
    .eq("id", user.id)
    .single();

  const profile = profileData as UserProfile | null;

  const planType = profile?.plan_type || "free";
  const currentPlanLabel = getPlanLabel(planType);

  const canUseLocationFilters = isPlusOrHigher(planType);
  const canUseAdvancedFilters = isPremiumOrHigher(planType);
  const canUseProSorting = isPro(planType);

  const params = (await searchParams) || {};

  const q = params.q?.trim() || "";

  const rawCity = params.city?.trim() || "";
  const rawUniversity = params.university?.trim() || "";
  const rawExchangeType = getSafeExchangeType(
    params.exchange_type?.trim() || ""
  );
  const rawCondition = getSafeCondition(params.condition?.trim() || "");
  const rawSort = getSafeSort(params.sort?.trim() || "smart");

  const city = canUseLocationFilters ? rawCity : "";
  const university = canUseLocationFilters ? rawUniversity : "";
  const exchangeType = canUseAdvancedFilters ? rawExchangeType : "";
  const condition = canUseAdvancedFilters ? rawCondition : "";
  const sort = canUseProSorting ? rawSort : "smart";

  const onlyAvailable =
    canUseAdvancedFilters ? params.only_available !== "false" : true;

  const ownerGenderFilter =
    canUseAdvancedFilters &&
    profile?.match_gender_preference &&
    profile.match_gender_preference !== "everyone"
      ? profile.match_gender_preference
      : "";

  const blockedFilters = [
    !canUseLocationFilters && rawCity ? "Şehir filtresi Plus ile açılır." : "",
    !canUseLocationFilters && rawUniversity
      ? "Üniversite filtresi Plus ile açılır."
      : "",
    !canUseAdvancedFilters && rawExchangeType
      ? "Paylaşım türü filtresi Premium ile açılır."
      : "",
    !canUseAdvancedFilters && rawCondition
      ? "Kitap durumu filtresi Premium ile açılır."
      : "",
    !canUseProSorting && rawSort !== "smart"
      ? "Gelişmiş sıralama Pro ile açılır."
      : "",
  ].filter(Boolean);

  const { data, error } = await supabase.rpc("search_user_books", {
    p_search_query: q || null,
    p_filter_city: city || null,
    p_filter_university: university || null,
    p_filter_exchange_type: exchangeType || null,
    p_filter_condition: condition || null,
    p_filter_owner_gender: ownerGenderFilter || null,
    p_only_available: onlyAvailable,
    p_sort_by: sort,
  });

  const results = (data || []) as SmartBookResult[];

  const { data: suggestionData, error: suggestionError } = await supabase.rpc(
    "get_search_suggestions",
    {
      p_search_query: q || null,
    }
  );

  const suggestions = (suggestionData || []) as SearchSuggestion[];
  const topSuggestion = suggestions[0];

  const showDidYouMean =
    Boolean(q) &&
    Boolean(topSuggestion) &&
    normalizeText(topSuggestion?.value || "") !== normalizeText(q);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🔎
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Akıllı kitap arama
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/akis" className="hover:text-[#2E7D5B]">
              Akış
            </Link>
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/kitaplarim" className="hover:text-[#2E7D5B]">
              Kitaplarım
            </Link>
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
          </nav>

          <Link
            href="/kitap-ekle"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kitap Ekle
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Akıllı Kitap Keşfi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Aradığın kitabı en doğru kişiden bul.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Kitap adı, yazar, şehir, üniversite ve paketine göre açılan
                  gelişmiş filtrelerle sana en uygun rafları keşfet.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-80">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {currentPlanLabel}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Paket
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {results.length}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Sonuç
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {suggestions.length}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Öneri
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <form
          action="/kitap-ara"
          className="mt-6 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-6"
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Arama Paneli
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Kitap, yazar veya kategori ara
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Free arama herkese açık. Konum, gelişmiş filtre ve akıllı
                sıralama özellikleri paketine göre aktif olur.
              </p>
            </div>

            <Link
              href="/paketler"
              className="rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-5 py-2.5 text-center text-sm font-black text-[#B45309] transition hover:-translate-y-0.5"
            >
              Paketleri Gör
            </Link>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr]">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Akıllı Arama
              </label>

              <input
                name="q"
                defaultValue={q}
                placeholder="suc ceza, kurk mantolu, dostoyevski..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />

              <p className="mt-2 text-xs font-semibold text-slate-400">
                Kitap adı, yazar veya kategoriyle arama yap.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Şehir</label>

              <input
                name="city"
                defaultValue={city}
                disabled={!canUseLocationFilters}
                placeholder={
                  canUseLocationFilters ? "Aydın" : "Plus ile açılır"
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Üniversite
              </label>

              <input
                name="university"
                defaultValue={university}
                disabled={!canUseLocationFilters}
                placeholder={
                  canUseLocationFilters
                    ? "ADÜ, Adnan Menderes..."
                    : "Plus ile açılır"
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Paylaşım
              </label>

              <select
                name="exchange_type"
                defaultValue={exchangeType}
                disabled={!canUseAdvancedFilters}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Tümü</option>
                <option value="takas">Takas</option>
                <option value="odunc">Ödünç</option>
                <option value="satis">Satış</option>
                <option value="bagis">Bağış</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Kitap Durumu
              </label>

              <select
                name="condition"
                defaultValue={condition}
                disabled={!canUseAdvancedFilters}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Tümü</option>
                <option value="yeni">Yeni</option>
                <option value="temiz">Temiz</option>
                <option value="az_kullanilmis">Az Kullanılmış</option>
                <option value="orta">Orta</option>
                <option value="yipranmis">Yıpranmış</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Sıralama
              </label>

              <select
                name="sort"
                defaultValue={sort}
                disabled={!canUseProSorting}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="smart">Akıllı sıralama</option>
                <option value="newest">En yeni eklenenler</option>
                <option value="trust">Güven puanı yüksek</option>
                <option value="popular">En çok rafta olan</option>
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-[#FAF7F0] px-4 py-3">
              <input
                type="checkbox"
                name="only_available"
                value="true"
                defaultChecked={onlyAvailable}
                disabled={!canUseAdvancedFilters}
                className="h-4 w-4 rounded border-slate-300 accent-[#2E7D5B] disabled:cursor-not-allowed"
              />

              <span>
                <span className="block text-sm font-black text-[#1F2933]">
                  Sadece müsait kitaplar
                </span>
                <span className="block text-xs font-semibold text-slate-400">
                  Premium ile yönetilir.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {!canUseLocationFilters && (
              <LockedFeatureCard
                title="Konuma göre arama"
                description="Şehir ve üniversite filtrelerini açarak sana yakın kitapları daha hızlı bul."
                requiredPlan="Plus"
              />
            )}

            {!canUseAdvancedFilters && (
              <LockedFeatureCard
                title="Gelişmiş kitap filtreleri"
                description="Paylaşım türü, kitap durumu ve eşleşme tercihiyle daha doğru kişilere ulaş."
                requiredPlan="Premium"
              />
            )}

            {!canUseProSorting && (
              <LockedFeatureCard
                title="Pro akıllı sıralama"
                description="Güven puanı, popülerlik ve eşleşme şansı skoruna göre en iyi sonuçları önce gör."
                requiredPlan="Pro"
              />
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-[#2E7D5B]/10 bg-[#2E7D5B]/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-[#1F2933]">
                  Eşleşme Tercihin
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {canUseAdvancedFilters
                    ? `Arama sonuçlarında tercih: ${getPreferenceLabel(
                        profile?.match_gender_preference
                      )}`
                    : "Cinsiyet/eşleşme tercihi Premium ve Pro paketlerde arama sonuçlarına uygulanır."}
                </p>
              </div>

              <Link
                href="/profilim"
                className="rounded-full bg-white px-5 py-2.5 text-center text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
              >
                Tercihleri Düzenle
              </Link>
            </div>
          </div>

          {blockedFilters.length > 0 && (
            <div className="mt-5 rounded-2xl bg-[#F59E0B]/10 p-4 text-sm font-bold text-[#B45309]">
              {blockedFilters.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:flex sm:flex-row">
            <button
              type="submit"
              className="rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
            >
              Akıllı Ara
            </button>

            <Link
              href="/kitap-ara"
              className="rounded-full border border-[#2E7D5B]/20 px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#FAF7F0]"
            >
              Filtreleri Temizle
            </Link>
          </div>
        </form>

        {suggestionError && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Arama önerileri yüklenemedi: {suggestionError.message}
          </div>
        )}

        {showDidYouMean && topSuggestion && (
          <section className="mt-5 rounded-[1.8rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm ring-1 ring-[#F59E0B]/5 md:rounded-[2rem]">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
              Bunu mu demek istedin?
            </p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-black text-[#1F2933]">
                  {topSuggestion.value}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {topSuggestion.suggestion_type} ·{" "}
                  {topSuggestion.result_count} eşleşen kayıt
                </p>
              </div>

              <Link
                href={buildSearchHref({
                  q: topSuggestion.value,
                  city,
                  university,
                  exchangeType,
                  condition,
                  sort,
                })}
                className="rounded-full bg-[#F59E0B] px-6 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5"
              >
                Bu Sonucu Ara
              </Link>
            </div>
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="mt-5 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
                  {q ? "Arama önerileri" : "Popüler aramalar"}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {q
                    ? "Benzer kitap, yazar, kategori ve kampüs kayıtları."
                    : "Sistemde en çok bulunan kitap, yazar, kategori ve kampüs başlıkları."}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Link
                  key={`${suggestion.suggestion_type}-${suggestion.value}`}
                  href={buildSearchHref({
                    q: suggestion.value,
                    city,
                    university,
                    exchangeType,
                    condition,
                    sort,
                  })}
                  className="rounded-full border border-[#2E7D5B]/15 bg-[#FAF7F0] px-4 py-2 text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:border-[#2E7D5B]/30 hover:bg-[#F5EBDD]"
                >
                  {suggestion.value}
                  <span className="ml-2 text-slate-400">
                    {suggestion.suggestion_type}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-col justify-between gap-3 md:mt-8 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Sonuçlar
            </p>

            <h2 className="mt-2 text-2xl font-black">Arama Sonuçları</h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {results.length} aktif kitap listeleniyor.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/aradigim-kitaplar"
              className="rounded-full bg-white px-5 py-3 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-0.5"
            >
              Aradığım Kitaplar
            </Link>

            <Link
              href="/kitap-ekle"
              className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#25684c]"
            >
              Kitap Ekle
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
            Akıllı arama sırasında hata oluştu: {error.message}
          </div>
        )}

        {!error && results.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-[#2E7D5B]/30 bg-white p-10 text-center shadow-sm ring-1 ring-[#2E7D5B]/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              🔎
            </div>

            <h3 className="mt-5 text-2xl font-black">Sonuç bulunamadı</h3>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Aradığın kitap henüz eklenmemiş olabilir. Daha kısa bir kelimeyle
              veya yazar adıyla tekrar dene.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/aradigim-kitaplar"
                className="rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Aradığım Kitaplara Ekle
              </Link>

              <Link
                href="/kitap-ekle"
                className="rounded-full border border-[#2E7D5B]/20 px-6 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
              >
                Rafıma Kitap Ekle
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {results.map((book) => {
              const title =
                book.custom_title || book.book_title || "İsimsiz Kitap";
              const author =
                book.custom_author || book.book_author || "Yazar bilgisi yok";
              const image = book.image_url || book.book_cover_url;
              const ownerName =
                book.owner_full_name ||
                book.owner_username ||
                "KampüsRaf kullanıcısı";
              const ownerUniversity =
                book.owner_university ||
                book.university ||
                "Üniversite bilgisi yok";
              const ownerCity =
                book.owner_city || book.city || "Şehir bilgisi yok";
              const isMine = book.user_id === user.id;
              const matchChance = getMatchChance({ book, profile });

              return (
                <article
                  key={book.id}
                  className="group overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]"
                >
                  <div className="relative p-4 md:p-5">
                    <div className="flex gap-3 md:gap-4">
                      <Link
                        href={`/kitaplar/${book.id}`}
                        className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-3xl transition group-hover:scale-[1.02]"
                      >
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt={title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "📖"
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                            {exchangeTypeLabels[book.exchange_type] ||
                              book.exchange_type}
                          </span>

                          {isMine && (
                            <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                              Senin kitabın
                            </span>
                          )}
                        </div>

                        <Link href={`/kitaplar/${book.id}`}>
                          <h3 className="mt-3 line-clamp-2 text-lg font-black leading-tight text-[#1F2933] transition hover:text-[#2E7D5B] md:text-xl">
                            {title}
                          </h3>
                        </Link>

                        <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                          {author}
                        </p>

                        <p className="mt-2 text-xs font-bold text-[#2E7D5B]">
                          {book.book_category || "Kategori yok"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 px-4 py-4 md:px-5 md:py-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                        {conditionLabels[book.book_condition] ||
                          book.book_condition}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {book.status}
                      </span>

                      {canUseProSorting && (
                        <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                          Eşleşme Şansı %{matchChance}
                        </span>
                      )}
                    </div>

                    {!canUseProSorting && (
                      <div className="mt-4 rounded-2xl border border-dashed border-[#F59E0B]/25 bg-[#F59E0B]/5 p-3">
                        <p className="text-xs font-black text-[#B45309]">
                          🔒 Eşleşme şansı skoru Pro ile açılır
                        </p>
                      </div>
                    )}

                    {book.note && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
                        {book.note}
                      </p>
                    )}

                    <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-3 text-sm md:mt-5 md:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-black text-[#1F2933]">
                            {ownerName}
                          </p>

                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                            {ownerUniversity}
                          </p>

                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                            {ownerCity}
                          </p>
                        </div>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg">
                          👤
                        </div>
                      </div>

                      {book.owner_show_gender_on_profile && (
                        <p className="mt-2 text-xs font-black text-[#2E7D5B]">
                          {getGenderLabel(book.owner_gender)}
                        </p>
                      )}

                      {canUseProSorting && (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          Güven puanı: {book.trust_score || 0} · Bu kitap{" "}
                          {book.owner_count || 1} rafta
                        </p>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 md:mt-5 md:gap-3">
                      <Link
                        href={`/kitaplar/${book.id}`}
                        className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                      >
                        Detay Gör
                      </Link>

                      <span className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-xs font-black text-[#2E7D5B]">
                        Mesaj Yakında
                      </span>
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