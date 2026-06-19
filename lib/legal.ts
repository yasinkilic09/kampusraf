export const legalEffectiveDate = "19 Haziran 2026";

export const legalVersions = {
  kvkk: "2026-06-19",
  terms: "2026-06-19",
} as const;

export const legalContactEmail = "destek@kampusraf.com";

export type LegalSection = {
  title: string;
  items: string[];
};

export const kvkkSections: LegalSection[] = [
  {
    title: "Veri sorumlusu ve kapsam",
    items: [
      "Bu aydinlatma metni, KampusRaf web sitesi ve mobil uygulamasinda hesap olusturan, kitap ekleyen, sosyal akisa katilan ve harita/eslesme ozelliklerini kullanan kisiler icin hazirlanmistir.",
      "KampusRaf; hesap, kitap, iletisim, yaklasik konum, guvenlik ve kullanim verilerini yalnizca platformun sunulmasi, gelistirilmesi ve yasal yukumluluklerin yerine getirilmesi amaclariyla isler.",
    ],
  },
  {
    title: "Islenen veri kategorileri",
    items: [
      "Kimlik ve iletisim: ad soyad, kullanici adi, e-posta adresi.",
      "Profil ve egitim bilgileri: universite, bolum, sehir, profil aciklamasi, dogrulama durumu.",
      "Kitap ve paylasim verileri: kitap basligi, yazar, kapak, takas/odunc/satis/bagis tercihi, sosyal paylasimlar, alintilar ve yorumlar.",
      "Konum verisi: kullanici izin verirse yaklasik koordinat ve mesafe bilgisi. Tam adres gostermek yerine yakin kitap kesfini kolaylastirmak icin hassasiyet dusurulerek kullanilir.",
      "Teknik ve guvenlik verileri: oturum, cihaz, istek, hata, guvenlik ve kotuye kullanim onleme kayitlari.",
      "Paket ve reklam tercihleri: plan turu, reklam kaldirma tercihi, reklam/analitik riza durumlari ve odeme sureci icin gerekli sinirli bilgiler.",
    ],
  },
  {
    title: "Isleme amaclari ve hukuki sebepler",
    items: [
      "Hesap olusturma, kimlik dogrulama, sanal raf, kitap arama, eslesme, mesajlasma, bildirim ve topluluk ozelliklerini sunmak.",
      "Yakindaki kitaplari gostermek ve eslesmeleri mesafe tercihine gore siralamak.",
      "Platform guvenligini, dolandirilicilik ve kotuye kullanim onlemlerini saglamak.",
      "Kullanim limitleri, paket avantajlari ve reklamsiz deneyim gibi sozlesmesel hizmetleri yurutmek.",
      "Zorunlu veriler sozlesmenin kurulmasi/ifasi, mesru menfaat ve yasal yukumlulukler kapsaminda; konum, pazarlama ve kisisellestirilmis reklam gibi alanlar ise kullanicinin ayri izni veya acik rizasi ile islenir.",
    ],
  },
  {
    title: "Aktarimlar ve ucuncu taraf hizmetler",
    items: [
      "Veriler; barindirma, veritabani, kimlik dogrulama, bildirim, hata izleme, reklam ve analitik gibi teknik hizmet saglayicilarla yalnizca hizmetin gerektirdigi olcude paylasilabilir.",
      "Kitap ilanlari, profil bilgileri ve sosyal paylasimlar kullanicinin secimlerine gore diger kullanicilar tarafindan gorulebilir.",
      "Yetkili kamu kurumlarindan gelen hukuka uygun talepler halinde ilgili bilgiler yasal sinirlar icinde paylasilabilir.",
    ],
  },
  {
    title: "Saklama, guvenlik ve kullanici haklari",
    items: [
      "Veriler, hesabin aktif oldugu surece ve yasal saklama sureleri boyunca tutulur; amac ortadan kalktiginda silinir, yok edilir veya anonim hale getirilir.",
      "Kullanici; verisinin islenip islenmedigini ogrenme, bilgi talep etme, duzeltme, silme/yok etme, aktarim yapilan kisileri bilme, otomatik sonuclara itiraz etme ve zararinin giderilmesini talep etme haklarina sahiptir.",
      `Hak talepleri ve riza geri alma basvurulari icin ${legalContactEmail} adresinden KampusRaf ile iletisime gecilebilir.`,
    ],
  },
];

export const termsSections: LegalSection[] = [
  {
    title: "Hesap ve uygun kullanim",
    items: [
      "KampusRaf, ogrencilerin ve kitap okurlarinin kitap paylasimi, takas, odunc, satis, bagis, sosyal akis, alinti, topluluk ve harita tabanli kesif ozelliklerini kullanmasi icin sunulan bir platformdur.",
      "Kullanici, kayit olurken verdigi bilgilerin dogru oldugunu; hesabini baskasina devretmeyecegini ve hesabinin guvenliginden sorumlu oldugunu kabul eder.",
      "Platformu dolandirma, taciz, spam, telif ihlali, yaniltici ilan, yetkisiz veri toplama veya hizmeti bozacak otomatik islemler icin kullanmak yasaktir.",
    ],
  },
  {
    title: "Kitap ilanlari, takas ve iletisim",
    items: [
      "Kullanici ekledigi kitap, fotograf, aciklama, fiyat ve takas bilgilerinin dogrulugundan sorumludur.",
      "Takas, odunc verme, satis veya bagis anlasmalari kullanicilar arasinda kurulur. KampusRaf araci platformdur; taraflarin bulusma, teslimat ve odeme detaylarini dikkatli sekilde planlamasi gerekir.",
      "Guvensiz, supheli veya kurallara aykiri bir davranis fark edilirse kullanici platform yonetimine bildirimde bulunmalidir.",
    ],
  },
  {
    title: "Icerik, topluluk ve moderasyon",
    items: [
      "Kullanici paylastigi metin, gorsel, alinti, yorum ve topluluk iceriklerinden sorumludur.",
      "Nefret soylemi, siddet, kisilik hakki ihlali, telif ihlali, ozel hayat ihlali, rahatsiz edici veya yasa disi icerikler kaldirilabilir.",
      "KampusRaf, platform guvenligi ve topluluk kalitesi icin icerikleri inceleyebilir, gorunurlugu kisitlayabilir veya hesabi askıya alabilir.",
    ],
  },
  {
    title: "Paketler, reklamlar ve hizmet degisiklikleri",
    items: [
      "Temel ozellikler ucretsiz sunulabilir; gelismis limitler, gorunurluk, mesafe/eslesme tercihleri veya reklamsiz deneyim paketlerle saglanabilir.",
      "Reklamlar kullanici deneyimini bozmayacak olcude gosterilir. Reklamsiz paketlerde platform ici reklam alanlari kaldirilir; yasal veya islemsel duyurular buna dahil degildir.",
      "KampusRaf, ozellikleri, paket limitlerini ve hizmet kosullarini makul bildirimlerle guncelleyebilir.",
    ],
  },
  {
    title: "Sorumluluk sinirlari ve iletisim",
    items: [
      "KampusRaf, kullanicilar arasindaki kitap teslimi, odeme, bulusma veya takas sonucunu garanti etmez.",
      "Hizmetin kesintisiz veya hatasiz olacagi garanti edilmez; guvenlik, performans ve bakim icin gecici kesintiler olabilir.",
      `Kullanim kosullari hakkinda sorular icin ${legalContactEmail} adresinden iletisime gecilebilir.`,
    ],
  },
];

export function createLegalConsentMetadata({
  source,
  marketingConsent = false,
}: {
  source: "web-sign-up" | "mobile-sign-up";
  marketingConsent?: boolean;
}) {
  const acceptedAt = new Date().toISOString();

  return {
    kvkk_notice_read: true,
    kvkk_notice_version: legalVersions.kvkk,
    kvkk_notice_read_at: acceptedAt,
    terms_accepted: true,
    terms_version: legalVersions.terms,
    terms_accepted_at: acceptedAt,
    marketing_consent: marketingConsent,
    marketing_consent_at: marketingConsent ? acceptedAt : null,
    legal_consent_source: source,
  };
}
