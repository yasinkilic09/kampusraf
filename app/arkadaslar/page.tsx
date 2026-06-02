import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  removeFriendshipAction,
  respondFriendRequestAction,
} from "@/app/actions/friends";

type FriendProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  university: string | null;
  city: string | null;
  trust_score: number | null;
  verification_status: string | null;
  completed_exchange_count: number | null;
};

type FriendshipItem = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  requester: FriendProfile | FriendProfile[] | null;
  addressee: FriendProfile | FriendProfile[] | null;
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

function getProfileName(profile: FriendProfile | null) {
  return profile?.full_name || profile?.username || "KampüsRaf kullanıcısı";
}

function FriendCard({
  friendship,
  currentUserId,
  type,
}: {
  friendship: FriendshipItem;
  currentUserId: string;
  type: "friend" | "incoming" | "outgoing";
}) {
  const requester = first(friendship.requester);
  const addressee = first(friendship.addressee);

  const otherPerson =
    friendship.requester_id === currentUserId ? addressee : requester;

  const isVerified = otherPerson?.verification_status === "verified";

  return (
    <article className="rounded-[1.7rem] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem] md:p-6">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#2E7D5B]/10 text-2xl">
          👤
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {type === "friend" && (
              <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                Arkadaş
              </span>
            )}

            {type === "incoming" && (
              <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                Gelen İstek
              </span>
            )}

            {type === "outgoing" && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                Gönderilen İstek
              </span>
            )}

            {isVerified && (
              <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                🎓 Doğrulanmış
              </span>
            )}
          </div>

          <h3 className="mt-3 line-clamp-1 text-lg font-black text-[#1F2933]">
            {getProfileName(otherPerson)}
          </h3>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {otherPerson?.university || "Üniversite bilgisi yok"}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {otherPerson?.city || "Şehir bilgisi yok"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {(otherPerson?.trust_score || 0) > 0 && (
              <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-xs font-black text-slate-600">
                Güven: {otherPerson?.trust_score}
              </span>
            )}

            {(otherPerson?.completed_exchange_count || 0) > 0 && (
              <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-xs font-black text-slate-600">
                {otherPerson?.completed_exchange_count} takas
              </span>
            )}

            <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-xs font-black text-slate-600">
              {formatDate(friendship.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
        {type === "incoming" && (
          <>
            <form action={respondFriendRequestAction} className="w-full sm:w-auto">
              <input type="hidden" name="friendshipId" value={friendship.id} />
              <input type="hidden" name="response" value="accepted" />
              <button
                type="submit"
                className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 sm:w-auto"
              >
                Kabul Et
              </button>
            </form>

            <form action={respondFriendRequestAction} className="w-full sm:w-auto">
              <input type="hidden" name="friendshipId" value={friendship.id} />
              <input type="hidden" name="response" value="rejected" />
              <button
                type="submit"
                className="w-full rounded-full border border-red-100 bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:-translate-y-0.5 sm:w-auto"
              >
                Reddet
              </button>
            </form>
          </>
        )}

        {type === "friend" && otherPerson && (
          <Link
            href={`/mesajlar/kullanici/${otherPerson.id}`}
            className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 sm:w-auto"
          >
            Mesaj Gönder
          </Link>
        )}

        <form action={removeFriendshipAction} className="w-full sm:w-auto">
          <input type="hidden" name="friendshipId" value={friendship.id} />
          <button
            type="submit"
            className="w-full rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5 sm:w-auto"
          >
            {type === "outgoing" ? "İsteği İptal Et" : "Kaldır"}
          </button>
        </form>
      </div>
    </article>
  );
}

export default async function FriendsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      id,
      requester_id,
      addressee_id,
      status,
      created_at,
      updated_at,
      responded_at,
      requester:profiles!friendships_requester_id_fkey (
        id,
        full_name,
        username,
        university,
        city,
        trust_score,
        verification_status,
        completed_exchange_count
      ),
      addressee:profiles!friendships_addressee_id_fkey (
        id,
        full_name,
        username,
        university,
        city,
        trust_score,
        verification_status,
        completed_exchange_count
      )
    `
    )
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const friendships = (data || []) as FriendshipItem[];

  const friends = friendships.filter((item) => item.status === "accepted");

  const incomingRequests = friendships.filter(
    (item) => item.status === "pending" && item.addressee_id === user.id
  );

  const outgoingRequests = friendships.filter(
    (item) => item.status === "pending" && item.requester_id === user.id
  );

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
                Arkadaşlar
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
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Sosyal Kitap Ağı
          </p>

          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Arkadaşların ve isteklerin.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
            Kitap eşleşmelerinden tanıştığın öğrencileri arkadaş olarak ekle,
            güvenli bir sosyal okuma çevresi oluştur.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Arkadaşlarım</p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {friends.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Gelen İstekler</p>
            <p className="mt-3 text-4xl font-black text-[#F59E0B]">
              {incomingRequests.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">
              Gönderilen İstekler
            </p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {outgoingRequests.length}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
            Arkadaşlar yüklenirken hata oluştu: {error.message}
          </div>
        )}

        {!error && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Gelen İstekler</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Sana arkadaşlık isteği gönderen kullanıcılar.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                    {incomingRequests.length}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {incomingRequests.length === 0 ? (
                    <div className="rounded-2xl bg-[#FAF7F0] p-5 text-sm font-semibold text-slate-500">
                      Şu anda gelen arkadaşlık isteğin yok.
                    </div>
                  ) : (
                    incomingRequests.map((friendship) => (
                      <FriendCard
                        key={friendship.id}
                        friendship={friendship}
                        currentUserId={user.id}
                        type="incoming"
                      />
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Gönderilen İstekler</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Cevap bekleyen arkadaşlık isteklerin.
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {outgoingRequests.length}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {outgoingRequests.length === 0 ? (
                    <div className="rounded-2xl bg-[#FAF7F0] p-5 text-sm font-semibold text-slate-500">
                      Cevap bekleyen isteğin yok.
                    </div>
                  ) : (
                    outgoingRequests.map((friendship) => (
                      <FriendCard
                        key={friendship.id}
                        friendship={friendship}
                        currentUserId={user.id}
                        type="outgoing"
                      />
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Arkadaşlarım</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Kabul edilmiş KampüsRaf arkadaşların.
                  </p>
                </div>

                <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                  {friends.length}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {friends.length === 0 ? (
                  <div className="rounded-[1.7rem] border border-dashed border-[#2E7D5B]/25 bg-[#FAF7F0] p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl">
                      🤝
                    </div>

                    <h3 className="mt-5 text-xl font-black">
                      Henüz arkadaşın yok
                    </h3>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
                      Eşleşmelerden veya mesajlaştığın kişilerden arkadaşlık
                      isteği göndererek sosyal kitap ağını oluşturabilirsin.
                    </p>

                    <Link
                      href="/eslesmeler"
                      className="mt-6 inline-flex rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                    >
                      Eşleşmelere Git
                    </Link>
                  </div>
                ) : (
                  friends.map((friendship) => (
                    <FriendCard
                      key={friendship.id}
                      friendship={friendship}
                      currentUserId={user.id}
                      type="friend"
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}