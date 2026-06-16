import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { redirect } from "next/navigation";
import { ShareComposer } from "@/components/share-composer";
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
  success?: string;
};

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
    .in("status", ["mevcut", "available"])
    .order("created_at", { ascending: false })
    .limit(50);

  const userBooks = (userBooksData || []) as UserBook[];

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <AppHeader
        subtitle="Yeni paylaşım"
        active="paylas"
        actions={
          <Link
            href="/akis"
            className="rounded-full border border-[#2E7D5B]/20 px-5 py-2.5 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            Akışa Dön
          </Link>
        }
      />

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

            {params.success === "draft-ready" && (
              <div className="rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B]">
                Paylaşım alanı hazır. Fotoğrafını seçip açıklamanı ekleyebilirsin.
              </div>
            )}

            <ShareComposer userBooks={userBooks} />
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
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
                Paylaşım Türleri
              </p>

              <div className="mt-4 grid gap-2">
                <Link
                  href="/paylas"
                  className="flex items-center justify-between gap-3 rounded-[1.3rem] bg-[#EAF5EF] p-4 text-[#2E7D5B] transition hover:-translate-y-0.5"
                >
                  <div>
                    <p className="text-sm font-black">Fotoğraf Paylaş</p>
                    <p className="mt-1 text-xs font-semibold text-[#2E7D5B]/70">
                      Görsel, açıklama ve kitap etiketi.
                    </p>
                  </div>
                  <span className="text-sm font-black">Aktif</span>
                </Link>

                <Link
                  href="/rastgele-raf"
                  className="flex items-center justify-between gap-3 rounded-[1.3rem] bg-[#FFF7E6] p-4 text-[#B45309] transition hover:-translate-y-0.5"
                >
                  <div>
                    <p className="text-sm font-black">Alıntı Paylaş</p>
                    <p className="mt-1 text-xs font-semibold text-[#92400E]/75">
                      Zar at, alıntıyı favorile ve akışa gönder.
                    </p>
                  </div>
                  <span className="text-lg font-black">›</span>
                </Link>

                <Link
                  href="/kitap-ara"
                  className="flex items-center justify-between gap-3 rounded-[1.3rem] bg-[#FAF7F0] p-4 text-[#1F2933] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  <div>
                    <p className="text-sm font-black">Paylaşacak Kitap Bul</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Önce kitap keşfet, sonra rafına ekle.
                    </p>
                  </div>
                  <span className="text-lg font-black text-[#2E7D5B]">›</span>
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
