"use client";

import { useMemo, useState } from "react";
import {
  createExchangeAction,
  updateExchangeStatusAction,
} from "@/app/actions/exchanges";

type ExchangeTarget = {
  conversationId: string;
  title: string;
  author: string | null;
  exchangeId: string | null;
  status: string | null;
};

type UserExchangePanelProps = {
  targets: ExchangeTarget[];
  returnTo: string;
};

function getExchangeStatusLabel(status: string | null) {
  if (status === "requested") return "Takas Başlatıldı";
  if (status === "meeting_planned") return "Görüşme Planlandı";
  if (status === "handed_over") return "Kitap Teslim Edildi";
  if (status === "completed") return "Takas Tamamlandı";
  if (status === "canceled") return "Takas İptal Edildi";
  return "Başlatılmadı";
}

function getExchangeStatusDescription(status: string | null) {
  if (status === "requested") {
    return "Takas süreci başlatıldı. Görüşme veya teslim detayları netleştirilebilir.";
  }

  if (status === "meeting_planned") {
    return "Görüşme planlandı. Kitap teslim edildiğinde süreci ilerletebilirsin.";
  }

  if (status === "handed_over") {
    return "Kitap teslim edildi olarak işaretlendi. Süreç tamamlanabilir.";
  }

  if (status === "completed") {
    return "Bu takas tamamlandı ve güven profiline işlendi.";
  }

  if (status === "canceled") {
    return "Bu takas iptal edildi. Mesajlaşmaya devam edebilirsin.";
  }

  return "Bu kitap için henüz takas süreci başlatılmadı.";
}

function getExchangeStatusClass(status: string | null) {
  if (status === "requested") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "meeting_planned") return "bg-blue-50 text-blue-600";
  if (status === "handed_over") return "bg-purple-50 text-purple-600";
  if (status === "completed") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "canceled") return "bg-red-50 text-red-600";
  return "bg-white text-slate-500";
}

export function UserExchangePanel({ targets, returnTo }: UserExchangePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const activeCount = targets.filter(
    (target) =>
      target.status &&
      target.status !== "completed" &&
      target.status !== "canceled"
  ).length;

  const completedCount = targets.filter(
    (target) => target.status === "completed"
  ).length;

  const notStartedCount = targets.filter((target) => !target.status).length;

  const filteredTargets = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return targets;

    return targets.filter((target) => {
      return [target.title, target.author, getExchangeStatusLabel(target.status)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [targets, search]);

  return (
    <>
      <div className="mb-5 rounded-[1.7rem] bg-white p-4 shadow-sm md:mb-6 md:rounded-[2rem] md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
              Takas Süreçleri
            </p>

            <h2 className="mt-2 text-xl font-black text-[#1F2933] md:text-2xl">
              Bu kişiyle kitap teslim durumları
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Bu kullanıcıyla olan tüm kitap takaslarını tek pencereden yönet.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 sm:w-auto"
          >
            Takasları Yönet
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-[#FAF7F0] p-4">
            <p className="text-2xl font-black text-[#1F2933]">
              {targets.length}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Kitap sohbeti
            </p>
          </div>

          <div className="rounded-2xl bg-[#F59E0B]/10 p-4">
            <p className="text-2xl font-black text-[#B45309]">
              {activeCount}
            </p>
            <p className="mt-1 text-xs font-bold text-[#B45309]/70">
              Aktif süreç
            </p>
          </div>

          <div className="rounded-2xl bg-[#2E7D5B]/10 p-4">
            <p className="text-2xl font-black text-[#2E7D5B]">
              {completedCount}
            </p>
            <p className="mt-1 text-xs font-bold text-[#2E7D5B]/70">
              Tamamlanan
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-2xl font-black text-slate-600">
              {notStartedCount}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Başlatılmadı
            </p>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm md:items-center md:p-6">
          <button
            type="button"
            aria-label="Takas penceresini kapat"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0"
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[81] flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl md:rounded-[2rem]"
          >
            <div className="border-b border-slate-100 p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                    Takas Yönetimi
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-[#1F2933]">
                    Kitap teslim süreçleri
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Her kitap için takas durumunu ayrı ayrı yönetebilirsin.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF7F0] text-sm font-black text-slate-500 transition hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Kitap veya durum ara..."
                  className="w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#FAF7F0] p-4 md:p-5">
              {filteredTargets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#2E7D5B]/20 bg-white p-8 text-center">
                  <div className="text-4xl">🔎</div>
                  <p className="mt-3 text-sm font-black text-[#1F2933]">
                    Sonuç bulunamadı
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Arama kelimeni değiştirerek tekrar dene.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredTargets.map((target) => (
                    <div
                      key={target.conversationId}
                      className="rounded-[1.5rem] bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-base font-black text-[#1F2933]">
                            📘 {target.title}
                          </p>

                          {target.author && (
                            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                              {target.author}
                            </p>
                          )}

                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {getExchangeStatusDescription(target.status)}
                          </p>
                        </div>

                        <span
                          className={`w-fit shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${getExchangeStatusClass(
                            target.status
                          )}`}
                        >
                          {getExchangeStatusLabel(target.status)}
                        </span>
                      </div>

                      {!target.exchangeId && (
                        <form action={createExchangeAction} className="mt-4">
                          <input
                            type="hidden"
                            name="conversationId"
                            value={target.conversationId}
                          />
                          <input type="hidden" name="returnTo" value={returnTo} />

                          <button
                            type="submit"
                            className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-xs font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 sm:w-auto"
                          >
                            Takas Sürecini Başlat
                          </button>
                        </form>
                      )}

                      {target.exchangeId &&
                        target.status !== "completed" &&
                        target.status !== "canceled" && (
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            {target.status === "requested" && (
                              <ExchangeStatusForm
                                exchangeId={target.exchangeId}
                                conversationId={target.conversationId}
                                returnTo={returnTo}
                                status="meeting_planned"
                                label="Görüşme Planlandı"
                              />
                            )}

                            {target.status === "meeting_planned" && (
                              <ExchangeStatusForm
                                exchangeId={target.exchangeId}
                                conversationId={target.conversationId}
                                returnTo={returnTo}
                                status="handed_over"
                                label="Kitap Teslim Edildi"
                              />
                            )}

                            {target.status === "handed_over" && (
                              <ExchangeStatusForm
                                exchangeId={target.exchangeId}
                                conversationId={target.conversationId}
                                returnTo={returnTo}
                                status="completed"
                                label="Takası Tamamla"
                              />
                            )}

                            <ExchangeStatusForm
                              exchangeId={target.exchangeId}
                              conversationId={target.conversationId}
                              returnTo={returnTo}
                              status="canceled"
                              label="Takası İptal Et"
                              danger
                            />
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ExchangeStatusForm({
  exchangeId,
  conversationId,
  returnTo,
  status,
  label,
  danger = false,
}: {
  exchangeId: string;
  conversationId: string;
  returnTo: string;
  status: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={updateExchangeStatusAction}>
      <input type="hidden" name="exchangeId" value={exchangeId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <button
        type="submit"
        className={
          danger
            ? "w-full rounded-full border border-red-200 px-5 py-3 text-xs font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50"
            : "w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5"
        }
      >
        {label}
      </button>
    </form>
  );
}