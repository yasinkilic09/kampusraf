import Link from "next/link";
import { redirect } from "next/navigation";
import { createSocialPostAction } from "@/app/actions/social-posts";
import { createClient } from "@/lib/supabase/server";

type UserBook = {
  id: string;
  custom_title: string | null;
  custom_author: string | null;
  books:
    | {
        id: string;
        title: string | null;
        author: string | null;
      }
    | {
        id: string;
        title: string | null;
        author: string | null;
      }[]
    | null;
};

type SearchParams = {
  error?: string;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
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
        author
      )
    `
    )
    .eq("user_id", user.id)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(50);

  const userBooks = (userBooksData || []) as UserBook[];

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/akis" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📸
            </div>

            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Yeni Paylaşım
              </p>
            </div>
          </Link>

          <Link
            href="/akis"
            className="rounded-full border border-[#2E7D5B]/20 px-5 py-2.5 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            Akışa Dön
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2rem] md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Sosyal Paylaşım
          </p>

          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            Kitap anını paylaş.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
            Okuduğun kitabı, kampüs anını veya rafındaki kitabı fotoğrafla
            paylaş. İstersen paylaşımına kitap etiketi de ekleyebilirsin.
          </p>
        </div>

        {params.error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <form
          action={createSocialPostAction}
          className="mt-6 grid gap-6 rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="rounded-[1.5rem] bg-[#FAF7F0] p-5">
            <label className="text-sm font-black text-[#1F2933]">
              Fotoğraf
            </label>

            <input
              type="file"
              name="image"
              required
              accept="image/jpeg,image/png,image/webp"
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#2E7D5B] file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
            />

            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
              JPG, PNG veya WEBP yükleyebilirsin. En fazla 10 MB. Dikey
              fotoğraflar akışta daha iyi görünür.
            </p>

            <div className="mt-6 rounded-2xl border border-dashed border-[#2E7D5B]/25 bg-white p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
                📚
              </div>

              <p className="mt-4 text-sm font-black text-[#1F2933]">
                Paylaşım fikri
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                “Bugün bu kitaba başladım”, “Bu kitabı takasa açtım” veya
                “Kampüste okuma molası” tarzı doğal paylaşımlar KampüsRaf’a çok
                uygun olur.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-black text-[#1F2933]">
                Açıklama
              </label>

              <textarea
                name="caption"
                rows={6}
                placeholder="Paylaşımına kısa bir açıklama yaz..."
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-black text-[#1F2933]">
                Kitap Etiketi
              </label>

              <select
                name="relatedBookId"
                defaultValue=""
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              >
                <option value="">Kitap etiketi ekleme</option>

                {userBooks.map((item) => {
                  const book = first(item.books);
                  const title = item.custom_title || book?.title || "Kitap";
                  const author =
                    item.custom_author || book?.author || "Yazar belirtilmemiş";

                  return (
                    <option key={item.id} value={book?.id || ""}>
                      {title} — {author}
                    </option>
                  );
                })}
              </select>

              <p className="mt-2 text-xs font-semibold text-slate-400">
                Paylaşımı bir kitapla ilişkilendirir. Sonraki aşamada bu etiket
                kitap sayfasına yönlendirecek.
              </p>
            </div>

            <div>
              <label className="text-sm font-black text-[#1F2933]">
                Görünürlük
              </label>

              <select
                name="visibility"
                defaultValue="friends"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              >
                <option value="friends">Sadece arkadaşlarım</option>
                <option value="public">Herkese açık</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
            >
              Paylaş
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}