import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversationAction } from "@/app/actions/conversations";
import { sendFriendRequestAction } from "@/app/actions/friends";
import { ProfileTrustCard } from "@/components/profile-trust-card";

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
  mevcut: "Mevcut",
  rezerve: "Rezerve",
  verildi: "Verildi",
  takaslandi: "Takaslandı",
  pasif: "Pasif",
};

type OwnerProfile = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  university: string | null;
  department: string | null;
  city: string | null;
  bio: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
  account_status: string | null;
  verification_status: string | null;
  completed_exchange_count: number | null;
  response_score: number | null;
};

type BookDetail = {
  id: string;
  user_id: string;
  book_id: string;
  condition: string;
  exchange_type: string;
  status: string;
  custom_title: string | null;
  custom_author: string | null;
  image_url: string | null;
  note: string | null;
  city: string | null;
  university: string | null;
  created_at: string;
  books:
    | {
        title: string;
        author: string | null;
        category: string | null;
        isbn: string | null;
        cover_url: string | null;
        description: string | null;
      }
    | {
        title: string;
        author: string | null;
        category: string | null;
        isbn: string | null;
        cover_url: string | null;
        description: string | null;
      }[]
    | null;
  profiles: OwnerProfile | OwnerProfile[] | null;
};

type FriendshipSummary = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

function getBookInfo(userBook: BookDetail) {
  const relatedBook = Array.isArray(userBook.books)
    ? userBook.books[0]
    : userBook.books;

  return {
    title: userBook.custom_title || relatedBook?.title || "İsimsiz Kitap",
    author: userBook.custom_author || relatedBook?.author || "Yazar bilgisi yok",
    category: relatedBook?.category || "Kategori yok",
    isbn: relatedBook?.isbn || null,
    description: relatedBook?.description || null,
    image: userBook.image_url || relatedBook?.cover_url || null,
  };
}

function getOwnerInfo(userBook: BookDetail) {
  const owner = Array.isArray(userBook.profiles)
    ? userBook.profiles[0]
    : userBook.profiles;

  const profileFields = [
    owner?.full_name,
    owner?.username,
    owner?.university || userBook.university,
    owner?.department,
    owner?.city || userBook.city,
    owner?.bio,
  ];

  const completedFields = profileFields.filter(
    (field) => field && String(field).trim().length > 0
  ).length;

  return {
    fullName: owner?.full_name || "KampüsRaf kullanıcısı",
    username: owner?.username || "",
    avatarUrl: owner?.avatar_url || null,
    university:
      owner?.university || userBook.university || "Üniversite bilgisi yok",
    department: owner?.department || "Bölüm bilgisi yok",
    city: owner?.city || userBook.city || "Şehir bilgisi yok",
    bio: owner?.bio || null,
    trustScore: owner?.trust_score ?? 60,
    isVerified: owner?.is_verified || false,
    verificationStatus: owner?.verification_status || "unverified",
    accountStatus: owner?.account_status || "active",
    completedExchangeCount: owner?.completed_exchange_count ?? 0,
    responseScore: owner?.response_score ?? 0,
    profileCompletionScore: Math.round(
      (completedFields / profileFields.length) * 100
    ),
  };
}

function getFriendshipViewState(
  friendship: FriendshipSummary | null,
  currentUserId: string
) {
  if (!friendship) {
    return {
      label: "Arkadaş Ekle",
      description: "Kitap sahibine arkadaşlık isteği gönder.",
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

function getStatusBadgeClass(status: string) {
  if (status === "mevcut") {
    return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  }

  if (status === "rezerve") {
    return "bg-[#F59E0B]/10 text-[#B45309]";
  }

  if (status === "verildi" || status === "takaslandi") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "pasif") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-slate-100 text-slate-600";
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "K";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("user_books")
    .select(
      `
      id,
      user_id,
      book_id,
      condition,
      exchange_type,
      status,
      custom_title,
      custom_author,
      image_url,
      note,
      city,
      university,
      created_at,
      books (
        title,
        author,
        category,
        isbn,
        cover_url,
        description
      ),
      profiles (
        full_name,
        username,
        avatar_url,
        university,
        department,
        city,
        bio,
        trust_score,
        is_verified,
        verification_status,
        account_status,
        completed_exchange_count,
        response_score
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const userBook = data as BookDetail;
  const book = getBookInfo(userBook);
  const owner = getOwnerInfo(userBook);
  const isMine = userBook.user_id === user.id;

  let friendship: FriendshipSummary | null = null;

  if (!isMine) {
    const { data: friendshipData } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${userBook.user_id}),and(requester_id.eq.${userBook.user_id},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    friendship = friendshipData as FriendshipSummary | null;
  }

  const friendshipState = getFriendshipViewState(friendship, user.id);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📖
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Kitap vitrini
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
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
            href={isMine ? "/kitaplarim" : "/kitap-ara"}
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            {isMine ? "Rafıma Dön" : "Kitap Ara"}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Link
            href={isMine ? "/kitaplarim" : "/kitap-ara"}
            className="inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-0.5 sm:w-auto"
          >
            ← {isMine ? "Kitaplarıma dön" : "Arama sonuçlarına dön"}
          </Link>

          {owner.username && !isMine && (
            <Link
              href={`/profil/${owner.username}`}
              className="inline-flex w-full justify-center rounded-full border border-[#2E7D5B]/20 bg-white px-5 py-3 text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5 sm:w-auto"
            >
              Kitap sahibinin profili
            </Link>
          )}
        </div>

        <section className="mt-6 overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:mt-8 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-end">
              <div className="rounded-[1.7rem] bg-white/10 p-4 backdrop-blur">
                <div className="mx-auto flex h-[360px] max-w-[260px] items-center justify-center overflow-hidden rounded-[1.4rem] bg-[#FAF7F0] text-6xl shadow-2xl shadow-black/15">
                  {book.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.image}
                      alt={book.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "📖"
                  )}
                </div>

                <div className="mt-4 h-5 rounded-full bg-[#7B4F2C] shadow-inner" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                    {book.category}
                  </span>

                  <span
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      userBook.status === "mevcut"
                        ? "bg-white text-[#2E7D5B]"
                        : "bg-[#F59E0B] text-white"
                    }`}
                  >
                    {statusLabels[userBook.status] || userBook.status}
                  </span>

                  {isMine && (
                    <span className="rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-black text-white">
                      Senin kitabın
                    </span>
                  )}
                </div>

                <h1 className="mt-5 break-words text-3xl font-black leading-tight tracking-tight md:text-6xl">
                  {book.title}
                </h1>

                <p className="mt-4 line-clamp-2 text-lg font-bold text-white/75 md:text-xl">
                  {book.author}
                </p>

                {book.isbn && (
                  <p className="mt-3 text-sm font-semibold text-white/55">
                    ISBN: {book.isbn}
                  </p>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                      Durum
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {conditionLabels[userBook.condition] ||
                        userBook.condition}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                      Paylaşım
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {exchangeTypeLabels[userBook.exchange_type] ||
                        userBook.exchange_type}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                      Eklenme
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {formatDate(userBook.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {isMine ? (
                    <Link
                      href="/kitaplarim"
                      className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                    >
                      Kitaplarım’a Git
                    </Link>
                  ) : (
                    <>
                      <form action={startConversationAction}>
                        <input
                          type="hidden"
                          name="userBookId"
                          value={userBook.id}
                        />
                        <button
                          type="submit"
                          className="w-full rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 sm:w-auto"
                        >
                          Mesaj Gönder
                        </button>
                      </form>

                      {friendshipState.type === "accepted" ? (
                        <Link
                          href="/arkadaslar"
                          className="rounded-full border border-white/25 bg-white/10 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                        >
                          Arkadaşsınız
                        </Link>
                      ) : friendshipState.type === "incoming" ? (
                        <Link
                          href="/arkadaslar"
                          className="rounded-full bg-[#F59E0B] px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                        >
                          İsteği Yanıtla
                        </Link>
                      ) : (
                        <form action={sendFriendRequestAction}>
                          <input
                            type="hidden"
                            name="addresseeId"
                            value={userBook.user_id}
                          />
                          <input
                            type="hidden"
                            name="redirectTo"
                            value={`/kitaplar/${userBook.id}`}
                          />

                          <button
                            type="submit"
                            disabled={friendshipState.type === "outgoing"}
                            className="w-full rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            {friendshipState.label}
                          </button>
                        </form>
                      )}
                    </>
                  )}

                  <Link
                    href={`/kitap-ara?q=${encodeURIComponent(book.title)}`}
                    className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Benzer Kitapları Ara
                  </Link>
                </div>

                {!isMine && (
                  <p className="mt-4 text-xs font-semibold text-white/55">
                    {friendshipState.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8">
          <div className="space-y-6">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Kitap Notu
              </p>

              <h2 className="mt-2 text-2xl font-black">Kitap Açıklaması</h2>

              {userBook.note || book.description ? (
                <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base md:leading-8">
                  {userBook.note || book.description}
                </p>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-500 md:text-base md:leading-8">
                  Bu kitap için henüz açıklama eklenmemiş.
                </p>
              )}
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                Teslim / Konum Bilgisi
              </p>

              <h2 className="mt-2 text-2xl font-black">Kitap nerede?</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Üniversite
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                    {userBook.university || owner.university}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Şehir
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                    {userBook.city || owner.city}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-[#2E7D5B]/10 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Güvenli Paylaşım
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Teslimden önce dikkat et
              </h2>

              <div className="mt-5 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                <p className="rounded-2xl bg-[#FAF7F0] p-4">
                  ✓ Tam adres paylaşmadan önce kullanıcıyla uygulama içinde konuş.
                </p>
                <p className="rounded-2xl bg-[#FAF7F0] p-4">
                  ✓ Mümkünse kampüs, kütüphane veya kalabalık bir noktada buluş.
                </p>
                <p className="rounded-2xl bg-[#FAF7F0] p-4">
                  ✓ Kitap teslimi tamamlanmadan kişisel bilgilerini paylaşma.
                </p>
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <section className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <div className="bg-[#8B5E3C] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/85">
                Kitap Sahibi
              </div>

              <div className="p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#FAF7F0] text-2xl font-black text-[#2E7D5B]">
                    {owner.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={owner.avatarUrl}
                        alt={owner.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitial(owner.fullName)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="line-clamp-2 text-xl font-black leading-tight">
                        {owner.fullName}
                      </h2>

                      {owner.isVerified && (
                        <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                          Doğrulanmış
                        </span>
                      )}
                    </div>

                    {owner.username && (
                      <Link
                        href={`/profil/${owner.username}`}
                        className="mt-1 inline-flex text-sm font-bold text-[#2E7D5B] hover:underline"
                      >
                        @{owner.username}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                      Üniversite
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
                      {owner.university}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                      Bölüm
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
                      {owner.department}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#FAF7F0] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Şehir
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
                        {owner.city}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAF7F0] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Güven
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
                        {owner.trustScore}
                      </p>
                    </div>
                  </div>
                </div>

                {owner.bio && (
                  <p className="mt-5 rounded-2xl bg-[#FAF7F0] p-4 text-sm leading-7 text-slate-600">
                    {owner.bio}
                  </p>
                )}

                {!isMine && (
                  <div className="mt-5 grid gap-3">
                    <form action={startConversationAction}>
                      <input
                        type="hidden"
                        name="userBookId"
                        value={userBook.id}
                      />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                      >
                        Mesaj Gönder
                      </button>
                    </form>

                    {friendshipState.type === "accepted" ? (
                      <Link
                        href="/arkadaslar"
                        className="rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-6 py-3 text-center text-sm font-black text-[#B45309] transition hover:-translate-y-0.5"
                      >
                        Arkadaşsınız
                      </Link>
                    ) : friendshipState.type === "incoming" ? (
                      <Link
                        href="/arkadaslar"
                        className="rounded-full bg-[#F59E0B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                      >
                        İsteği Yanıtla
                      </Link>
                    ) : (
                      <form action={sendFriendRequestAction}>
                        <input
                          type="hidden"
                          name="addresseeId"
                          value={userBook.user_id}
                        />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={`/kitaplar/${userBook.id}`}
                        />

                        <button
                          type="submit"
                          disabled={friendshipState.type === "outgoing"}
                          className="w-full rounded-full border border-[#2E7D5B]/20 px-6 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {friendshipState.label}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </section>

            <ProfileTrustCard
              isVerified={owner.isVerified}
              verificationStatus={owner.verificationStatus}
              accountStatus={owner.accountStatus}
              trustScore={owner.trustScore}
              completedExchangeCount={owner.completedExchangeCount}
              responseScore={owner.responseScore}
              profileCompletionScore={owner.profileCompletionScore}
              compact
            />
          </aside>
        </section>
      </section>
    </main>
  );
}