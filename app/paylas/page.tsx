import Link from "next/link";
import { redirect } from "next/navigation";
import { createSocialPostAction } from "@/app/actions/social-posts";
import { createClient } from "@/lib/supabase/server";
import { StudentVerifiedBadge } from "@/components/student-verified-badge";

type UserBook = {
  id: string;
  custom_title: string | null;
  custom_author: string | null;
  books:
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }[]
    | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
};

type SearchParams = {
  error?: string;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getProfileName(profile: Profile | null, email?: string | null) {
  return profile?.full_name || profile?.username || email || "KampüsRaf kullanıcısı";
}

function getUsername(profile: Profile | null) {
  return profile?.username ? `@${profile.username}` : "@kampusraf";
}

export default async function SharePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as Profile | null;

  const { data: userBooksData } = await supabase
    .from("user_books")
    .select(
      `
      id,
      custom_title,
      custom_author,
      books (
        id,
        title,
        author,
        cover_url
      )
    `
    )
    .eq("user_id", user.id)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(50);

  const userBooks = (userBooksData || []) as UserBook[];

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📸
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Yeni paylaşım
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
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
          </nav>

          <Link
            href="/akis"
            className="rounded-full border border-[#2E7D5B]/20 px-5 py-2.5 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            Akışa Dön
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.1rem]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/2 h-36 w-36 rounded-full bg-[#F59E0B]/20 blur-3xl" />

                <div className="relative">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                    Sosyal Paylaşım
                  </p>

                  <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
                    Kitap anını kampüsle paylaş.
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                    Fotoğraf ekle, kısa bir açıklama yaz ve istersen rafındaki
                    bir kitabı gönderine etiketle.
                  </p>
                </div>
              </div>
            </section>

            {params.error && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
                {decodeURIComponent(params.error)}
              </div>
            )}

            <form
              action={createSocialPostAction}
              className="grid gap-6 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7 lg:grid-cols-[0.95fr_1.05fr]"
            >
              <section className="rounded-[1.6rem] bg-[#FAF7F0] p-5 md:rounded-[1.8rem]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
                      Görsel
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Fotoğraf Seç
                    </h2>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                    Max 10 MB
                  </span>
                </div>

                <label className="mt-5 flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-[#2E7D5B]/25 bg-white p-6 text-center transition hover:border-[#2E7D5B]/50 hover:bg-[#2E7D5B]/5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
                    📸
                  </div>

                  <p className="mt-4 text-sm font-black text-[#1F2933]">
                    Paylaşım görselini yükle
                  </p>

                  <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-slate-500">
                    JPG, PNG veya WEBP yükleyebilirsin. Dikey fotoğraflar
                    akışta daha iyi görünür.
                  </p>

                  <input
                    type="file"
                    name="image"
                    required
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-5 w-full max-w-sm rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#2E7D5B] file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
                  />
                </label>

                <div className="mt-5 rounded-[1.4rem] bg-white p-4">
                  <p className="text-sm font-black text-[#1F2933]">
                    Paylaşım fikri
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                    “Bugün bu kitaba başladım”, “Bu kitabı takasa açtım” veya
                    “Kampüste okuma molası” gibi doğal paylaşımlar daha iyi
                    etkileşim alır.
                  </p>
                </div>
              </section>

              <section className="space-y-5">
                <div>
                  <label className="text-sm font-black text-[#1F2933]">
                    Açıklama
                  </label>

                  <textarea
                    name="caption"
                    rows={7}
                    placeholder="Paylaşımına kısa ve doğal bir açıklama yaz..."
                    className="mt-3 w-full resize-none rounded-[1.4rem] border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-black text-[#1F2933]">
                    Kitap Etiketi
                  </label>

                  <select
                    name="relatedBookId"
                    defaultValue=""
                    className="mt-3 w-full rounded-[1.4rem] border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  >
                    <option value="">Kitap etiketi ekleme</option>

                    {userBooks.map((item) => {
                      const book = first(item.books);
                      const title = item.custom_title || book?.title || "Kitap";
                      const author =
                        item.custom_author ||
                        book?.author ||
                        "Yazar belirtilmemiş";

                      return (
                        <option key={item.id} value={book?.id || ""}>
                          {title} — {author}
                        </option>
                      );
                    })}
                  </select>

                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    Kitap etiketi, gönderiyi kitap keşfiyle ilişkilendirir.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-black text-[#1F2933]">
                    Görünürlük
                  </label>

                  <select
                    name="visibility"
                    defaultValue="friends"
                    className="mt-3 w-full rounded-[1.4rem] border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  >
                    <option value="friends">Sadece arkadaşlarım</option>
                    <option value="public">Herkese açık</option>
                  </select>
                </div>

                <div className="rounded-[1.5rem] bg-[#FAF7F0] p-4">
                  <p className="text-sm font-black text-[#1F2933]">
                    Paylaşım nerede görünecek?
                  </p>
                  <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500">
                    <p>🌿 Akış sayfasında</p>
                    <p>👤 Sosyal profilinde</p>
                    <p>📖 Kitap etiketi seçtiysen kitap keşfinde</p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                >
                  Paylaşımı Yayınla
                </button>
              </section>
            </form>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-2xl">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={getProfileName(profile, user.email)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-black">
                      {getProfileName(profile, user.email)}
                    </p>

                    {profile?.verification_status === "verified" && (
                      <StudentVerifiedBadge />
                    )}
                  </div>

                  <p className="truncate text-xs font-black text-[#2E7D5B]">
                    {getUsername(profile)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link
                  href="/akis"
                  className="rounded-2xl bg-[#2E7D5B] px-4 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Akış
                </Link>

                <Link
                  href={
                    profile?.username ? `/profil/${profile.username}` : "/profilim"
                  }
                  className="rounded-2xl bg-[#FAF7F0] px-4 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                >
                  Profilim
                </Link>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                Kontrol Listesi
              </p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.3rem] bg-[#FAF7F0] p-4">
                  <p className="text-sm font-black">1. Fotoğraf net mi?</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Kitap, kampüs veya okuma anı anlaşılır görünmeli.
                  </p>
                </div>

                <div className="rounded-[1.3rem] bg-[#FAF7F0] p-4">
                  <p className="text-sm font-black">2. Açıklama doğal mı?</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Kısa, samimi ve öğrencilerin anlayacağı dilde olsun.
                  </p>
                </div>

                <div className="rounded-[1.3rem] bg-[#FAF7F0] p-4">
                  <p className="text-sm font-black">3. Kitap etiketi var mı?</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Kitap etiketi gönderiyi daha anlamlı hale getirir.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
                İpucu
              </p>
              <h2 className="mt-2 text-xl font-black">
                Kitap etiketli paylaşımlar daha değerli.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Etiketlediğin kitap, profilinde ve akışta gönderiyi daha
                anlaşılır hale getirir. Bu da kitap keşfini güçlendirir.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}