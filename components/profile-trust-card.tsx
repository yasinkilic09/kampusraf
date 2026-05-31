import { StudentVerifiedBadge } from "@/components/student-verified-badge";

type ProfileTrustCardProps = {
  isVerified?: boolean | null;
  verificationStatus?: string | null;
  trustScore?: number | null;
  completedExchangeCount?: number | null;
  responseScore?: number | null;
  profileCompletionScore?: number;
  compact?: boolean;
};

function getTrustLabel(score: number) {
  if (score >= 85) return "Çok Güvenilir";
  if (score >= 70) return "Güvenilir";
  if (score >= 50) return "Yeni / Gelişiyor";
  return "Düşük Güven";
}

function getTrustColor(score: number) {
  if (score >= 85) return "text-[#2E7D5B]";
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function getBarColor(score: number) {
  if (score >= 85) return "bg-[#2E7D5B]";
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function ProfileTrustCard({
  isVerified,
  verificationStatus,
  trustScore,
  completedExchangeCount,
  responseScore,
  profileCompletionScore = 0,
  compact = false,
}: ProfileTrustCardProps) {
  const isStudentVerified = verificationStatus === "verified";
  const score = Math.max(0, Math.min(trustScore ?? 60, 100));
  const completion = Math.max(0, Math.min(profileCompletionScore, 100));
  const exchanges = completedExchangeCount ?? 0;
  const response = responseScore ?? 0;

  return (
    <section
      className={`rounded-[1.7rem] bg-white shadow-sm md:rounded-[2rem] ${
        compact ? "p-4" : "p-5 md:p-7"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
            Güven Profili
          </p>

          <h2
            className={`mt-2 font-black text-[#1F2933] ${
              compact ? "text-lg" : "text-2xl"
            }`}
          >
            {getTrustLabel(score)}
          </h2>
        </div>

        {isStudentVerified ? (
  <StudentVerifiedBadge compact={compact} />
) : isVerified ? (
  <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
    ✓ Doğrulanmış
  </span>
) : (
  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">
    Doğrulanmamış
  </span>
)}
      </div>

      <div className="mt-5 rounded-2xl bg-[#FAF7F0] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-600">
            Güven Puanı
          </span>

          <span className={`text-xl font-black ${getTrustColor(score)}`}>
            {score}/100
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div
            className={`h-full rounded-full ${getBarColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#FAF7F0] p-3">
          <p className="text-xs font-bold text-slate-400">Profil Doluluğu</p>
          <p className="mt-1 text-lg font-black text-[#1F2933]">
            %{completion}
          </p>
        </div>

        <div className="rounded-2xl bg-[#FAF7F0] p-3">
          <p className="text-xs font-bold text-slate-400">Tamamlanan Takas</p>
          <p className="mt-1 text-lg font-black text-[#1F2933]">
            {exchanges}
          </p>
        </div>

        <div className="rounded-2xl bg-[#FAF7F0] p-3">
          <p className="text-xs font-bold text-slate-400">Yanıt Skoru</p>
          <p className="mt-1 text-lg font-black text-[#1F2933]">
            {response}/100
          </p>
        </div>
      </div>

      {!compact && (
        <p className="mt-4 text-xs leading-5 text-slate-400">
          Güven puanı; profil doluluğu, doğrulama durumu, tamamlanan takaslar ve
          yanıt davranışı gibi sinyallerle geliştirilecek şekilde hazırlanmıştır.
        </p>
      )}
    </section>
  );
}