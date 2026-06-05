"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const onboardingSteps = [
  {
    icon: "📚",
    title: "Rafını oluştur",
    description: "Sahip olduğun kitapları ekle ve kampüsteki öğrencilerle paylaş.",
  },
  {
    icon: "🔎",
    title: "Aradığın kitabı bul",
    description: "Şehir, üniversite ve akıllı eşleşme sinyalleriyle daha hızlı keşfet.",
  },
  {
    icon: "🤝",
    title: "Güvenli takas yap",
    description: "Mesajlaş, buluşma planla ve takas sürecini güvenle tamamla.",
  },
];

const benefits = [
  "Öğrenci odaklı sosyal kitap ağı",
  "Akıllı kitap eşleşmeleri",
  "Mesajlaşma ve takas süreci",
  "Doğrulanmış öğrenci rozeti",
];

function cleanUsernameValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [showPassword, setShowPassword] = useState(false);

  const cleanUsername = useMemo(() => cleanUsernameValue(username), [username]);
  const passwordIsWeak = password.length > 0 && password.length < 6;

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setMessage("");
    setMessageType("");

    if (!cleanUsername) {
      setMessage("Lütfen geçerli bir kullanıcı adı gir.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage("Şifre en az 6 karakter olmalı.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: cleanUsername,
          university: university.trim(),
          department: department.trim(),
          city: city.trim(),
        },
      },
    });

    if (error) {
      console.error("Supabase kayıt hatası:", error);
      setMessage(`Kayıt hatası: ${error.message}`);
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setMessage("Kayıt başarılı. Giriş sayfasına yönlendiriliyorsun.");
    setMessageType("success");

    setTimeout(() => {
      router.push("/auth/login");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#FAF7F0] text-[#1F2933]">
      <section className="relative min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-28 bottom-10 h-80 w-80 rounded-full bg-[#2E7D5B]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

        <div className="relative mx-auto grid min-h-[calc(100vh-40px)] max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <section className="order-2 flex flex-col justify-between rounded-[2rem] bg-[#2E7D5B] p-5 text-white shadow-2xl shadow-[#2E7D5B]/20 sm:p-7 lg:order-1 lg:min-h-[calc(100vh-72px)] lg:p-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-lg shadow-black/10">
                  📚
                </div>

                <div>
                  <p className="text-2xl font-black tracking-tight">
                    Kampüs<span className="text-[#F59E0B]">Raf</span>
                  </p>
                  <p className="text-xs font-bold text-white/60">
                    Sosyal kitap paylaşım ağı
                  </p>
                </div>
              </Link>

              <div className="mt-12 max-w-2xl lg:mt-20">
                <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                  Kampüs topluluğuna katıl
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Rafındaki kitap başka bir öğrencinin aradığı kitap olabilir.
                </h1>

                <p className="mt-5 max-w-xl text-base font-medium leading-8 text-white/72 sm:text-lg">
                  KampüsRaf hesabını oluştur, kitaplarını paylaş, aradığın
                  kitaplara ulaş ve güvenli takas sürecine dahil ol.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {benefits.map((item) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-black backdrop-blur"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-3">
              {onboardingSteps.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                >
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-xl">
                      {item.icon}
                    </div>

                    <div>
                      <h3 className="font-black">{item.title}</h3>
                      <p className="mt-1 text-sm font-medium leading-6 text-white/62">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="order-1 flex items-center justify-center py-6 lg:order-2 lg:py-0">
            <div className="w-full max-w-[620px] rounded-[2rem] border border-white bg-white/90 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-7 lg:p-8">
              <div className="rounded-[1.6rem] bg-[#FAF7F0] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                      Kayıt Ol
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                      KampüsRaf hesabını oluştur
                    </h2>
                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#2E7D5B] text-2xl text-white shadow-lg shadow-[#2E7D5B]/20">
                    🎓
                  </div>
                </div>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Öğrenci profilini oluştur, kitap ekle, eşleşmeleri keşfet ve
                  güvenli takas ağına katıl.
                </p>
              </div>

              <form onSubmit={handleSignUp} className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-black text-slate-700">
                      Ad Soyad
                    </label>
                    <input
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Ad Soyad"
                      autoComplete="name"
                      className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2E7D5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-black text-slate-700">
                      Kullanıcı adı
                    </label>
                    <input
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="kampusrafli"
                      autoComplete="username"
                      className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2E7D5B] focus:bg-white"
                    />
                    {username && (
                      <p className="mt-2 text-xs font-bold text-slate-400">
                        Profil adresin: @{cleanUsername || "kullanici-adi"}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-700">
                    E-posta
                  </label>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 transition focus-within:border-[#2E7D5B] focus-within:bg-white">
                    <span className="text-lg">✉️</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="ornek@mail.com"
                      autoComplete="email"
                      className="min-h-[52px] w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-black text-slate-700">
                      Şifre
                    </label>
                    <span
                      className={`text-xs font-bold ${
                        passwordIsWeak ? "text-red-500" : "text-slate-400"
                      }`}
                    >
                      En az 6 karakter
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 transition focus-within:border-[#2E7D5B] focus-within:bg-white">
                    <span className="text-lg">🔑</span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="En az 6 karakter"
                      autoComplete="new-password"
                      className="min-h-[52px] w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-black text-[#2E7D5B] transition hover:bg-[#2E7D5B]/10"
                    >
                      {showPassword ? "Gizle" : "Göster"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-700">
                    Üniversite
                  </label>
                  <input
                    required
                    value={university}
                    onChange={(event) => setUniversity(event.target.value)}
                    placeholder="Aydın Adnan Menderes Üniversitesi"
                    className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-black text-slate-700">
                      Bölüm
                    </label>
                    <input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="Radyo, Televizyon ve Sinema"
                      className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2E7D5B] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-black text-slate-700">
                      Şehir
                    </label>
                    <input
                      required
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Aydın"
                      className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2E7D5B] focus:bg-white"
                    />
                  </div>
                </div>

                {message && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                      messageType === "error"
                        ? "border-red-100 bg-red-50 text-red-700"
                        : "border-[#2E7D5B]/10 bg-[#2E7D5B]/10 text-[#2E7D5B]"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isLoading ? "Kayıt oluşturuluyor..." : "Hesabımı Oluştur"}
                  {!isLoading && (
                    <span className="transition group-hover:translate-x-0.5">
                      →
                    </span>
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-[1.4rem] border border-[#F59E0B]/15 bg-[#F59E0B]/10 p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg">
                    🛡️
                  </div>

                  <div>
                    <p className="text-sm font-black text-[#1F2933]">
                      Sonraki adım: öğrenci doğrulama
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      Kayıttan sonra profilinden öğrenci doğrulama rozetini
                      aktifleştirerek güven sinyalini güçlendirebilirsin.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-sm font-semibold text-slate-500">
                Zaten hesabın var mı?{" "}
                <Link
                  href="/auth/login"
                  className="font-black text-[#2E7D5B] transition hover:text-[#25684c]"
                >
                  Giriş yap
                </Link>
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}