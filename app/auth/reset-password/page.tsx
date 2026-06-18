"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setMessage("");
    setMessageType("");

    if (password.length < 6) {
      setMessage("\u015eifre en az 6 karakter olmal\u0131.");
      setMessageType("error");
      return;
    }

    if (password !== passwordAgain) {
      setMessage("\u015eifreler e\u015fle\u015fmiyor.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(
        "\u015eifre g\u00fcncellenemedi. Ba\u011flant\u0131n\u0131n s\u00fcresi dolmu\u015f olabilir; yeni bir s\u0131f\u0131rlama ba\u011flant\u0131s\u0131 iste."
      );
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setMessage("\u015eifren g\u00fcncellendi. Giri\u015f sayfas\u0131na y\u00f6nlendiriliyorsun.");
    setMessageType("success");

    setTimeout(() => {
      router.push("/auth/login");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#FAF7F0] text-[#1F2933]">
      <section className="relative flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#2E7D5B]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

        <div className="relative w-full max-w-[560px] rounded-[2rem] border border-white bg-white/90 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-7 lg:p-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] shadow-lg shadow-black/10">
              <Image
                src="/logo-symbol.png"
                alt="Kamp\u00fcsRaf logo"
                width={44}
                height={44}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>

            <div>
              <p className="text-2xl font-black tracking-tight">
                Kamp\u00fcs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-bold text-slate-500">
                Sosyal kitap payla\u015f\u0131m a\u011f\u0131
              </p>
            </div>
          </Link>

          <div className="mt-8 rounded-[1.6rem] bg-[#FAF7F0] p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Yeni \u015eifre
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              \u015eifreni yenile
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              E-postandaki ba\u011flant\u0131 ile geldiysen yeni \u015fifreni belirleyip
              hesab\u0131na tekrar giri\u015f yapabilirsin.
            </p>
          </div>

          <form onSubmit={handlePasswordReset} className="mt-7 space-y-5">
            <div>
              <label className="text-sm font-black text-slate-700">
                Yeni \u015fifre
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="En az 6 karakter"
                autoComplete="new-password"
                className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                Yeni \u015fifre tekrar
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordAgain}
                onChange={(event) => setPasswordAgain(event.target.value)}
                placeholder="\u015eifreni tekrar yaz"
                autoComplete="new-password"
                className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            {message ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                  messageType === "error"
                    ? "border-red-100 bg-red-50 text-red-700"
                    : "border-[#2E7D5B]/10 bg-[#2E7D5B]/10 text-[#2E7D5B]"
                }`}
              >
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading ? "\u015eifre g\u00fcncelleniyor..." : "\u015eifremi G\u00fcncelle"}
              {!isLoading ? (
                <span className="transition group-hover:translate-x-0.5">
                  \u2192
                </span>
              ) : null}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-semibold text-slate-500">
            Yeni ba\u011flant\u0131 m\u0131 gerekli?{" "}
            <Link
              href="/auth/forgot-password"
              className="font-black text-[#2E7D5B] transition hover:text-[#25684c]"
            >
              Tekrar iste
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
