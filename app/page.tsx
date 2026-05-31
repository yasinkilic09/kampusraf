import Link from "next/link";

const features = [
  {
    title: "Kitaplarını Rafa Ekle",
    description:
      "Elindeki kitapları sisteme ekle; takas, ödünç, satış veya bağış seçenekleriyle başka öğrencilerle paylaş.",
    icon: "📚",
  },
  {
    title: "Yakındaki Kitapları Bul",
    description:
      "Aradığın kitabı aynı şehirde, aynı üniversitede veya yakınındaki öğrencilerde kolayca bul.",
    icon: "📍",
  },
  {
    title: "Öğrencilerle Mesajlaş",
    description:
      "Kitap sahibiyle uygulama içinden iletişime geç, takas ya da ödünç alma sürecini güvenli şekilde yönet.",
    icon: "💬",
  },
  {
    title: "Aynı Kitabı Okuyanlarla Eşleş",
    description:
      "Seninle aynı kitabı okuyan veya okumak isteyen öğrencilerle tanış, kampüs içinde sosyal okuma ağı kur.",
    icon: "🤝",
  },
];

const steps = [
  {
    number: "01",
    title: "Üye ol",
    text: "Profilini oluştur, üniversiteni ve şehir bilgini ekle.",
  },
  {
    number: "02",
    title: "Kitaplarını ekle",
    text: "Rafındaki kitapları sisteme kaydet ve paylaşım türünü seç.",
  },
  {
    number: "03",
    title: "Kitap bul ve mesajlaş",
    text: "Aradığın kitabı yakınındaki öğrencilerde bul, mesajlaş ve anlaş.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <section className="relative overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#2E7D5B]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#F59E0B]/10 blur-3xl" />

        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white shadow-lg shadow-[#2E7D5B]/20">
              📚
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-medium text-slate-500">
                Sosyal kitap paylaşım ağı
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#nasil-calisir" className="transition hover:text-[#2E7D5B]">
              Nasıl Çalışır?
            </a>
            <a href="#ozellikler" className="transition hover:text-[#2E7D5B]">
              Özellikler
            </a>
            <a href="#guvenlik" className="transition hover:text-[#2E7D5B]">
              Güvenlik
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden rounded-full px-5 py-2.5 text-sm font-bold text-[#2E7D5B] transition hover:bg-white md:inline-flex"
            >
              Giriş Yap
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
            >
              Kayıt Ol
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pb-28 md:pt-20">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#2E7D5B]/20 bg-white/70 px-4 py-2 text-sm font-bold text-[#2E7D5B] shadow-sm">
              Öğrenciler için konum tabanlı kitap paylaşım platformu
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight text-[#1F2933] md:text-7xl">
              Kitaplar rafta kalmasın,{" "}
              <span className="text-[#2E7D5B]">kampüste dolaşıma çıksın.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              KampüsRaf, öğrencilerin ellerindeki kitapları paylaşabildiği,
              aradığı kitapları yakınındaki kişilerde bulabildiği ve kitaplar
              üzerinden sosyalleşebildiği web ve mobil platformdur.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-[#2E7D5B] px-8 py-4 text-center text-sm font-black text-white shadow-xl shadow-[#2E7D5B]/20 transition hover:-translate-y-1 hover:bg-[#25684c]"
              >
                Hemen Başla
              </Link>
              <a
                href="#nasil-calisir"
                className="rounded-full border border-[#2E7D5B]/20 bg-white px-8 py-4 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-1 hover:border-[#2E7D5B]/40"
              >
                Nasıl Çalışır?
              </a>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
              <div className="rounded-3xl bg-white/80 p-4 shadow-sm">
                <p className="text-2xl font-black text-[#2E7D5B]">+Kitap</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Paylaşım
                </p>
              </div>
              <div className="rounded-3xl bg-white/80 p-4 shadow-sm">
                <p className="text-2xl font-black text-[#2E7D5B]">Yakın</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Konum
                </p>
              </div>
              <div className="rounded-3xl bg-white/80 p-4 shadow-sm">
                <p className="text-2xl font-black text-[#2E7D5B]">Sosyal</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Okuma
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
              <div className="rounded-[1.5rem] bg-[#2E7D5B] p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white/70">
                      Yakındaki kitaplar
                    </p>
                    <h2 className="mt-1 text-2xl font-black">Kampüs Rafı</h2>
                  </div>
                  <div className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-bold">
                    1.2 km
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {[
                    {
                      name: "Suç ve Ceza",
                      author: "Dostoyevski",
                      type: "Takas",
                    },
                    {
                      name: "Nutuk",
                      author: "Mustafa Kemal Atatürk",
                      type: "Ödünç",
                    },
                    {
                      name: "Kürk Mantolu Madonna",
                      author: "Sabahattin Ali",
                      type: "Bağış",
                    },
                  ].map((book) => (
                    <div
                      key={book.name}
                      className="flex items-center justify-between rounded-3xl bg-white/12 p-4 backdrop-blur"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-10 items-center justify-center rounded-xl bg-[#F5EBDD] text-lg">
                          📖
                        </div>
                        <div>
                          <p className="font-black">{book.name}</p>
                          <p className="text-xs font-medium text-white/65">
                            {book.author}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#F59E0B] px-3 py-1 text-xs font-black text-white">
                        {book.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-[#FAF7F0] p-5">
                  <p className="text-sm font-bold text-slate-500">
                    Aktif paylaşım
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
                    128
                  </p>
                </div>
                <div className="rounded-3xl bg-[#FAF7F0] p-5">
                  <p className="text-sm font-bold text-slate-500">
                    Okuma eşleşmesi
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#F59E0B]">
                    42
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="nasil-calisir" className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            Nasıl çalışır?
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Üç adımda kitabını paylaş, aradığın kitaba ulaş.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-[2rem] border border-[#2E7D5B]/10 bg-white p-7 shadow-sm"
            >
              <p className="text-sm font-black text-[#F59E0B]">
                {step.number}
              </p>
              <h3 className="mt-4 text-2xl font-black text-[#2E7D5B]">
                {step.title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="ozellikler" className="bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Özellikler
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Kampüs içi kitap paylaşımını sosyal deneyime dönüştürür.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[2rem] border border-slate-100 bg-[#FAF7F0] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-xl font-black text-[#1F2933]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="guvenlik" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-[#1F2933] p-8 text-white md:grid-cols-[0.9fr_1.1fr] md:p-12">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Güvenli kullanım
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">
              Konum bilgisi kontrollü, iletişim uygulama içinde.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Tam adres gösterilmez.",
              "Yaklaşık mesafe gösterilir.",
              "Mesajlaşma uygulama içinde yapılır.",
              "Şikayet ve engelleme sistemi eklenir.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm font-bold text-white/80"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] bg-[#2E7D5B] p-8 text-center text-white shadow-2xl shadow-[#2E7D5B]/20 md:p-14">
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Rafındaki kitap başka bir öğrencinin aradığı kitap olabilir.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/75">
            KampüsRaf’a katıl, kitaplarını paylaş, aradığın kitapları yakınında
            bul ve kitaplar üzerinden yeni bağlantılar kur.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-white px-8 py-4 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1"
            >
              Ücretsiz Kayıt Ol
            </Link>
            <Link
              href="/auth/login"
              className="rounded-full border border-white/25 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/10"
            >
              Hesabım Var
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2E7D5B]/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-semibold text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 KampüsRaf. Tüm hakları saklıdır.</p>
          <p>Kitaplar paylaşılır, fikirler büyür.</p>
        </div>
      </footer>
    </main>
  );
}