import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  plan_type: string | null;
  verification_status: string | null;
  is_verified: boolean | null;
  university: string | null;
  department: string | null;
  city: string | null;
  verification_requested_at: string | null;
};

type ExchangeRow = {
  id: string;
  conversation_id: string;
  status: string;
  updated_at: string;
  requester_id: string;
  owner_id: string;
};

function getPlanLabel(plan?: string | null) {
  if (plan === "plus") return "Plus";
  if (plan === "premium") return "Premium";
  if (plan === "pro") return "Pro";
  return "Ücretsiz";
}

function getVerificationLabel(status?: string | null) {
  if (status === "pending") return "İnceleme Bekliyor";
  if (status === "verified") return "Doğrulandı";
  if (status === "rejected") return "Reddedildi";
  return "Doğrulanmadı";
}

function getVerificationClass(status?: string | null) {
  if (status === "verified") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#F59E0B]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getExchangeStatusLabel(status: string) {
  if (status === "requested") return "Takas Başlatıldı";
  if (status === "meeting_planned") return "Görüşme Planlandı";
  if (status === "handed_over") return "Kitap Teslim Edildi";
  if (status === "completed") return "Takas Tamamlandı";
  if (status === "canceled") return "Takas İptal Edildi";
  return "Takas Süreci";
}

function getExchangeStatusClass(status: string) {
  if (status === "completed") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "canceled") return "bg-red-50 text-red-600";
  if (status === "handed_over") return "bg-blue-50 text-blue-600";
  if (status === "meeting_planned") return "bg-[#F59E0B]/10 text-[#F59E0B]";
  return "bg-slate-100 text-slate-600";
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { count: totalUsersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: pendingVerificationCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "pending");

  const { count: verifiedStudentCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "verified");

  const { count: rejectedVerificationCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "rejected");

  const { count: totalBooksCount } = await supabase
    .from("user_books")
    .select("*", { count: "exact", head: true });

  const { count: totalRequestsCount } = await supabase
    .from("book_requests")
    .select("*", { count: "exact", head: true });

  const { count: activeExchangesCount } = await supabase
    .from("exchanges")
    .select("*", { count: "exact", head: true })
    .in("status", ["requested", "meeting_planned", "handed_over"]);

  const { count: completedExchangesCount } = await supabase
    .from("exchanges")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  const { data: planRows } = await supabase
    .from("profiles")
    .select("plan_type");

  const planStats = {
    free: (planRows || []).filter(
      (item) => !item.plan_type || item.plan_type === "free"
    ).length,
    plus: (planRows || []).filter((item) => item.plan_type === "plus").length,
    premium: (planRows || []).filter((item) => item.plan_type === "premium")
      .length,
    pro: (planRows || []).filter((item) => item.plan_type === "pro").length,
  };

  const { data: pendingProfilesData } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      username,
      email,
      role,
      plan_type,
      verification_status,
      is_verified,
      university,
      department,
      city,
      verification_requested_at
    `
    )
    .eq("verification_status", "pending")
    .order("verification_requested_at", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(5);

  const { data: recentExchangesData } = await supabase
    .from("exchanges")
    .select(
      `
      id,
      conversation_id,
      status,
      updated_at,
      requester_id,
      owner_id
    `
    )
    .order("updated_at", { ascending: false })
    .limit(5);

  const pendingProfiles = (pendingProfilesData || []) as ProfileRow[];
  const recentExchanges = (recentExchangesData || []) as ExchangeRow[];

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🛡️
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Admin Panel
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/admin/dogrulamalar" className="hover:text-[#2E7D5B]">
              Doğrulamalar
            </Link>
            <Link href="/ogrenci-dogrulama" className="hover:text-[#2E7D5B]">
              Öğrenci Doğrulama
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Yönetim Merkezi
          </p>

          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Admin paneli
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
            Kullanıcıları, doğrulama taleplerini, paket dağılımını ve takas
            süreçlerini tek ekrandan takip edebilirsin.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
              Admin: {currentProfile?.full_name || currentProfile?.email}
            </span>
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
              Sistem Durumu: Aktif
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-4 md:gap-5">
          {[
            {
              label: "Toplam Kullanıcı",
              value: totalUsersCount || 0,
              icon: "👥",
              color: "text-[#2E7D5B]",
            },
            {
              label: "Bekleyen Doğrulama",
              value: pendingVerificationCount || 0,
              icon: "🎓",
              color: "text-[#F59E0B]",
            },
            {
              label: "Doğrulanmış Öğrenci",
              value: verifiedStudentCount || 0,
              icon: "✅",
              color: "text-[#2E7D5B]",
            },
            {
              label: "Reddedilen Talep",
              value: rejectedVerificationCount || 0,
              icon: "❌",
              color: "text-red-500",
            },
            {
              label: "Eklenen Kitap",
              value: totalBooksCount || 0,
              icon: "📚",
              color: "text-[#2E7D5B]",
            },
            {
              label: "Arama Kaydı",
              value: totalRequestsCount || 0,
              icon: "🔖",
              color: "text-[#F59E0B]",
            },
            {
              label: "Aktif Takas",
              value: activeExchangesCount || 0,
              icon: "🤝",
              color: "text-blue-600",
            },
            {
              label: "Tamamlanan Takas",
              value: completedExchangesCount || 0,
              icon: "🏁",
              color: "text-[#2E7D5B]",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    {item.label}
                  </p>
                  <p className={`mt-2 text-3xl font-black ${item.color}`}>
                    {item.value}
                  </p>
                </div>
                <span className="text-2xl">{item.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:mt-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <aside className="space-y-5">
            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                Hızlı İşlemler
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/admin/dogrulamalar"
                  className="rounded-2xl bg-[#2E7D5B] p-4 text-white transition hover:-translate-y-0.5"
                >
                  <p className="text-sm font-black">Doğrulama Talepleri</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">
                    Öğrenci doğrulama taleplerini onayla veya reddet.
                  </p>
                </Link>

                <Link
                  href="/takaslar"
                  className="rounded-2xl bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5"
                >
                  <p className="text-sm font-black text-[#1F2933]">
                    Takasları Gör
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Kendi takas ekranına git.
                  </p>
                </Link>

                <Link
                  href="/bildirimler"
                  className="rounded-2xl bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5"
                >
                  <p className="text-sm font-black text-[#1F2933]">
                    Bildirimler
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Kendi bildirim merkezini aç.
                  </p>
                </Link>
              </div>
            </section>

            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                Paket Dağılımı
              </p>

              <div className="mt-5 grid gap-3">
                {[
                  { label: "Ücretsiz", value: planStats.free },
                  { label: "Plus", value: planStats.plus },
                  { label: "Premium", value: planStats.premium },
                  { label: "Pro", value: planStats.pro },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] p-4"
                  >
                    <span className="text-sm font-bold text-slate-600">
                      {item.label}
                    </span>
                    <span className="text-sm font-black text-[#2E7D5B]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                    Bekleyen Doğrulamalar
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Son talepler
                  </h2>
                </div>

                <Link
                  href="/admin/dogrulamalar"
                  className="rounded-full bg-[#2E7D5B] px-4 py-2 text-xs font-black text-white"
                >
                  Tümünü Gör
                </Link>
              </div>

              <div className="mt-5 grid gap-3">
                {pendingProfiles.length === 0 ? (
                  <div className="rounded-2xl bg-[#FAF7F0] p-5 text-center">
                    <p className="text-3xl">🎓</p>
                    <p className="mt-2 text-sm font-black text-[#1F2933]">
                      Bekleyen doğrulama yok
                    </p>
                  </div>
                ) : (
                  pendingProfiles.map((profile) => (
                    <Link
                      key={profile.id}
                      href="/admin/dogrulamalar"
                      className="block rounded-2xl bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-black ${getVerificationClass(
                            profile.verification_status
                          )}`}
                        >
                          {getVerificationLabel(profile.verification_status)}
                        </span>

                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                          {getPlanLabel(profile.plan_type)}
                        </span>
                      </div>

                      <p className="mt-3 break-words text-sm font-black text-[#1F2933]">
                        {profile.full_name ||
                          profile.username ||
                          "İsimsiz Kullanıcı"}
                      </p>

                      <p className="mt-1 break-words text-xs font-semibold text-slate-500">
                        {profile.email || "E-posta yok"}
                      </p>

                      <p className="mt-2 text-xs font-bold text-slate-400">
                        {profile.university || "Üniversite yok"} ·{" "}
                        {formatDate(profile.verification_requested_at)}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                Son Takas Hareketleri
              </p>

              <div className="mt-5 grid gap-3">
                {recentExchanges.length === 0 ? (
                  <div className="rounded-2xl bg-[#FAF7F0] p-5 text-center">
                    <p className="text-3xl">🤝</p>
                    <p className="mt-2 text-sm font-black text-[#1F2933]">
                      Henüz takas hareketi yok
                    </p>
                  </div>
                ) : (
                  recentExchanges.map((exchange) => (
                    <Link
                      key={exchange.id}
                      href={`/mesajlar/${exchange.conversation_id}`}
                      className="block rounded-2xl bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5"
                    >
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ${getExchangeStatusClass(
                          exchange.status
                        )}`}
                      >
                        {getExchangeStatusLabel(exchange.status)}
                      </span>

                      <p className="mt-3 text-sm font-black text-[#1F2933]">
                        Takas ID: {exchange.id.slice(0, 8)}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Son güncelleme: {formatDate(exchange.updated_at)}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}