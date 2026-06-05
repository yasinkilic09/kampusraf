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

type ExchangeProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
};

type ReportProfile = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  account_status: string | null;
};

type RecentReportRow = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reported_user: ReportProfile | ReportProfile[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

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
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#B45309]";
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
  if (status === "handed_over") return "bg-purple-50 text-purple-700";
  if (status === "meeting_planned") return "bg-blue-50 text-blue-700";
  if (status === "requested") return "bg-[#F59E0B]/10 text-[#B45309]";
  return "bg-slate-100 text-slate-600";
}

function getReportReasonLabel(reason: string) {
  if (reason === "spam") return "Spam / Rahatsız Edici";
  if (reason === "harassment") return "Taciz / Kötü Davranış";
  if (reason === "fraud") return "Dolandırıcılık Şüphesi";
  if (reason === "inappropriate") return "Uygunsuz İçerik";
  if (reason === "unsafe_exchange") return "Güvensiz Takas";
  return "Diğer";
}

function getReportStatusLabel(status: string) {
  if (status === "pending") return "Bekliyor";
  if (status === "reviewed") return "İncelendi";
  if (status === "action_taken") return "Aksiyon Alındı";
  if (status === "rejected") return "Reddedildi";
  return "Bekliyor";
}

function getReportStatusClass(status: string) {
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "reviewed") return "bg-blue-50 text-blue-700";
  if (status === "action_taken") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getAccountStatusLabel(status?: string | null) {
  if (status === "suspended") return "Askıda";
  if (status === "banned") return "Yasaklı";
  if (status === "limited") return "Kısıtlı";
  return "Aktif";
}

function getAccountStatusClass(status?: string | null) {
  if (status === "banned") return "bg-red-50 text-red-600";
  if (status === "suspended") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "limited") return "bg-blue-50 text-blue-700";
  return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
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

function getDisplayName(profile?: ExchangeProfile | null) {
  return (
    profile?.full_name ||
    profile?.username ||
    profile?.email ||
    "KampüsRaf kullanıcısı"
  );
}

function StatCard({
  label,
  value,
  icon,
  colorClass,
  description,
}: {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className={`mt-2 text-3xl font-black ${colorClass}`}>{value}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <span className="shrink-0 text-2xl">{icon}</span>
      </div>
    </div>
  );
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

  const { count: suspendedUsersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("account_status", "suspended");

  const { count: bannedUsersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("account_status", "banned");

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

  const { count: totalReportsCount } = await supabase
    .from("user_reports")
    .select("*", { count: "exact", head: true });

  const { count: pendingReportsCount } = await supabase
    .from("user_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: actionTakenReportsCount } = await supabase
    .from("user_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "action_taken");

    const { count: pendingQuotesCount } = await supabase
  .from("quote_items")
  .select("*", { count: "exact", head: true })
  .eq("status", "pending");

const { count: approvedQuotesCount } = await supabase
  .from("quote_items")
  .select("*", { count: "exact", head: true })
  .eq("status", "approved");

  const { data: planRows } = await supabase.from("profiles").select("plan_type");

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

  const { data: recentReportsData } = await supabase
    .from("user_reports")
    .select(
      `
      id,
      reason,
      status,
      created_at,
      reported_user:profiles!user_reports_reported_user_id_fkey (
        full_name,
        username,
        email,
        account_status
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(5);

  const pendingProfiles = (pendingProfilesData || []) as ProfileRow[];
  const recentExchanges = (recentExchangesData || []) as ExchangeRow[];
  const recentReports = (recentReportsData || []) as RecentReportRow[];

  const exchangeProfileIds = Array.from(
    new Set(
      recentExchanges.flatMap((exchange) => [
        exchange.requester_id,
        exchange.owner_id,
      ])
    )
  );

  const { data: exchangeProfilesData } =
    exchangeProfileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, email")
          .in("id", exchangeProfileIds)
      : { data: [] };

  const exchangeProfileMap = new Map(
    ((exchangeProfilesData || []) as ExchangeProfile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const totalUsers = totalUsersCount || 0;
  const platformActivityTotal =
    (totalBooksCount || 0) +
    (totalRequestsCount || 0) +
    (activeExchangesCount || 0) +
    (completedExchangesCount || 0);

  const adminName = currentProfile?.full_name || currentProfile?.email || "Admin";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🛡️
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Admin kontrol merkezi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/admin/dogrulamalar" className="hover:text-[#2E7D5B]">
              Doğrulamalar
            </Link>
            <Link href="/admin/kullanicilar" className="hover:text-[#2E7D5B]">
              Kullanıcılar
            </Link>
            <Link href="/admin/sikayetler" className="hover:text-[#2E7D5B]">
              Şikayetler
            </Link>
            <Link href="/admin/alintilar" className="hover:text-[#2E7D5B]">
  Alıntılar
</Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>

          <Link
            href="/admin/sikayetler"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Şikayetler
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
                  Admin Kontrol Merkezi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Platform güvenliğini ve büyümesini tek ekrandan yönet.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Kullanıcıları, doğrulama taleplerini, şikayetleri, paket
                  dağılımını ve takas hareketlerini buradan takip edebilirsin.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                    Admin: {adminName}
                  </span>
                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                    Sistem Durumu: Aktif
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {totalUsers}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Kullanıcı
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {pendingVerificationCount || 0}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Doğrulama
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {pendingReportsCount || 0}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Şikayet
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {platformActivityTotal}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Aktivite
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Toplam Kullanıcı"
            value={totalUsersCount || 0}
            icon="👥"
            colorClass="text-[#2E7D5B]"
            description="Platformdaki toplam profil sayısı."
          />
          <StatCard
            label="Bekleyen Doğrulama"
            value={pendingVerificationCount || 0}
            icon="🎓"
            colorClass="text-[#F59E0B]"
            description="Admin onayı bekleyen öğrenci talepleri."
          />
          <StatCard
            label="Bekleyen Şikayet"
            value={pendingReportsCount || 0}
            icon="🚩"
            colorClass="text-red-600"
            description="İncelenmesi gereken güvenlik bildirimleri."
          />
          <StatCard
            label="Aktif Takas"
            value={activeExchangesCount || 0}
            icon="🤝"
            colorClass="text-blue-600"
            description="Devam eden kitap teslim süreçleri."
          />
          <StatCard
  label="Bekleyen Alıntı"
  value={pendingQuotesCount || 0}
  icon="🎲"
  colorClass="text-[#F59E0B]"
  description="Rastgele Raf için admin onayı bekleyen içerikler."
/>
        </section>

        <section className="mt-4 grid gap-3 md:mt-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Doğrulanmış Öğrenci"
            value={verifiedStudentCount || 0}
            icon="✅"
            colorClass="text-[#2E7D5B]"
            description="Onaylanmış güvenilir öğrenci profilleri."
          />
          <StatCard
            label="Eklenen Kitap"
            value={totalBooksCount || 0}
            icon="📚"
            colorClass="text-[#2E7D5B]"
            description="Raflara eklenen toplam kitap kaydı."
          />
          <StatCard
            label="Arama Kaydı"
            value={totalRequestsCount || 0}
            icon="🔖"
            colorClass="text-[#F59E0B]"
            description="Kullanıcıların aradığı kitap kayıtları."
          />
          <StatCard
            label="Tamamlanan Takas"
            value={completedExchangesCount || 0}
            icon="🏁"
            colorClass="text-[#2E7D5B]"
            description="Başarıyla tamamlanan takas süreçleri."
          />
        </section>

        <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
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
                  href="/admin/sikayetler"
                  className="rounded-2xl bg-red-50 p-4 transition hover:-translate-y-0.5"
                >
                  <p className="text-sm font-black text-red-600">
                    Şikayet Yönetimi
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Kullanıcı bildirimlerini incele ve gerekli aksiyonu al.
                  </p>
                </Link>

                <Link
                  href="/admin/kullanicilar"
                  className="rounded-2xl bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5"
                >
                  <p className="text-sm font-black text-[#1F2933]">
                    Kullanıcı Yönetimi
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Kullanıcıları, rolleri ve hesap durumlarını yönet.
                  </p>
                </Link>

                <Link
  href="/admin/alintilar"
  className="rounded-2xl bg-[#F59E0B]/10 p-4 transition hover:-translate-y-0.5 hover:bg-[#F59E0B]/15"
>
  <p className="text-sm font-black text-[#B45309]">
    🎲 Alıntı Merkezi
  </p>
  <p className="mt-1 text-xs leading-5 text-slate-600">
    Rastgele Raf için alıntı havuzunu, çevirileri ve onay bekleyen içerikleri yönet.
  </p>

  <div className="mt-3 flex flex-wrap gap-2">
    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#B45309]">
      Bekleyen: {pendingQuotesCount || 0}
    </span>
    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#2E7D5B]">
      Yayında: {approvedQuotesCount || 0}
    </span>
  </div>
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

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Paket Dağılımı
              </p>

              <div className="mt-5 grid gap-3">
                {[
                  { label: "Ücretsiz", value: planStats.free },
                  { label: "Plus", value: planStats.plus },
                  { label: "Premium", value: planStats.premium },
                  { label: "Pro", value: planStats.pro },
                ].map((item) => {
                  const percent =
                    totalUsers > 0
                      ? Math.round((item.value / totalUsers) * 100)
                      : 0;

                  return (
                    <div key={item.label} className="rounded-2xl bg-[#FAF7F0] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-600">
                          {item.label}
                        </span>
                        <span className="text-sm font-black text-[#2E7D5B]">
                          {item.value}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[#2E7D5B]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        %{percent}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-red-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-500">
                Güvenlik Özeti
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-red-400">
                    Yasaklı Kullanıcı
                  </p>
                  <p className="mt-2 text-2xl font-black text-red-600">
                    {bannedUsersCount || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F59E0B]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B45309]">
                    Askıya Alınan
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#B45309]">
                    {suspendedUsersCount || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#2E7D5B]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2E7D5B]">
                    Aksiyon Alınan Şikayet
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                    {actionTakenReportsCount || 0}
                  </p>
                </div>
              </div>
            </section>
          </aside>

          <section className="space-y-5">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                    Bekleyen Doğrulamalar
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Son talepler</h2>
                </div>

                <Link
                  href="/admin/dogrulamalar"
                  className="w-fit rounded-full bg-[#2E7D5B] px-4 py-2 text-xs font-black text-white"
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
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-red-500">
                    Son Şikayetler
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Güvenlik bildirimleri
                  </h2>
                </div>

                <Link
                  href="/admin/sikayetler"
                  className="w-fit rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white"
                >
                  Tümünü Gör
                </Link>
              </div>

              <div className="mt-5 grid gap-3">
                {recentReports.length === 0 ? (
                  <div className="rounded-2xl bg-[#FAF7F0] p-5 text-center">
                    <p className="text-3xl">🚩</p>
                    <p className="mt-2 text-sm font-black text-[#1F2933]">
                      Henüz şikayet yok
                    </p>
                  </div>
                ) : (
                  recentReports.map((report) => {
                    const reportedUser = first(report.reported_user);

                    return (
                      <Link
                        key={report.id}
                        href="/admin/sikayetler"
                        className="block rounded-2xl bg-red-50 p-4 transition hover:-translate-y-0.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${getReportStatusClass(
                              report.status
                            )}`}
                          >
                            {getReportStatusLabel(report.status)}
                          </span>

                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-red-600">
                            {getReportReasonLabel(report.reason)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${getAccountStatusClass(
                              reportedUser?.account_status
                            )}`}
                          >
                            {getAccountStatusLabel(reportedUser?.account_status)}
                          </span>
                        </div>

                        <p className="mt-3 break-words text-sm font-black text-[#1F2933]">
                          {reportedUser?.full_name ||
                            reportedUser?.username ||
                            "Bildirilen kullanıcı"}
                        </p>

                        <p className="mt-1 break-words text-xs font-semibold text-slate-500">
                          {reportedUser?.email || "E-posta yok"}
                        </p>

                        <p className="mt-2 text-xs font-bold text-slate-400">
                          {formatDate(report.created_at)}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                    Son Takas Hareketleri
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Platform hareketleri
                  </h2>
                </div>

                <Link
                  href="/takaslar"
                  className="w-fit rounded-full border border-[#2E7D5B]/20 px-4 py-2 text-xs font-black text-[#2E7D5B]"
                >
                  Takaslarım
                </Link>
              </div>

              <div className="mt-5 grid gap-3">
                {recentExchanges.length === 0 ? (
                  <div className="rounded-2xl bg-[#FAF7F0] p-5 text-center">
                    <p className="text-3xl">🤝</p>
                    <p className="mt-2 text-sm font-black text-[#1F2933]">
                      Henüz takas hareketi yok
                    </p>
                  </div>
                ) : (
                  recentExchanges.map((exchange) => {
                    const requester = exchangeProfileMap.get(
                      exchange.requester_id
                    );
                    const owner = exchangeProfileMap.get(exchange.owner_id);

                    return (
                      <div
                        key={exchange.id}
                        className="rounded-2xl bg-[#FAF7F0] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${getExchangeStatusClass(
                              exchange.status
                            )}`}
                          >
                            {getExchangeStatusLabel(exchange.status)}
                          </span>

                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                            ID: {exchange.id.slice(0, 8)}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 md:grid-cols-2">
                          <p className="rounded-xl bg-white p-3">
                            İsteyen: {getDisplayName(requester)}
                          </p>
                          <p className="rounded-xl bg-white p-3">
                            Sahip: {getDisplayName(owner)}
                          </p>
                        </div>

                        <p className="mt-3 text-xs font-bold text-slate-400">
                          Son güncelleme: {formatDate(exchange.updated_at)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}