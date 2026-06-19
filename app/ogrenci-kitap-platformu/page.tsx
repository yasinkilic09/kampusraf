import { SeoLandingPage } from "@/components/seo-landing-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Öğrenci Kitap Platformu - Raf, Harita, Eşleşme ve Topluluk",
  description:
    "KampüsRaf; öğrenciler için kitap ekleme, kitap arama, takas, harita, eşleşme, sosyal akış ve topluluk özelliklerini bir araya getiren kitap platformudur.",
  path: "/ogrenci-kitap-platformu",
  keywords: [
    "öğrenci kitap platformu",
    "öğrenciler için kitap uygulaması",
    "üniversite kitap platformu",
    "kitap sosyal ağı",
  ],
});

export default function OgrenciKitapPlatformuPage() {
  return (
    <SeoLandingPage
      eyebrow="Öğrenci kitap platformu"
      title="Kitap arama, paylaşma ve sosyalleşme tek bir öğrenci platformunda."
      description="KampüsRaf, öğrencilerin kendi sanal kütüphanesini oluşturmasına, kitaplarını paylaşmasına, yakınındaki kitaplarla eşleşmesine ve okuma topluluklarına katılmasına yardımcı olur."
      path="/ogrenci-kitap-platformu"
      primaryKeyword="öğrenci kitap platformu"
      highlights={[
        "Sanal kütüphane ve Rafım deneyimi",
        "Akıllı eşleşme ve paket tercihleri",
        "Sosyal akış, alıntılar ve paylaşımlar",
        "Topluluklar ve mesajlaşma",
      ]}
      sections={[
        {
          title: "Sanal rafını yönet",
          text: "Kullanıcılar kitaplarını raflarında listeler, durumunu ve paylaşım türünü belirler, kitaplarını daha düzenli takip eder.",
        },
        {
          title: "Eşleşmeleri değerlendir",
          text: "Kitap arayan ve kitap paylaşan öğrenciler şehir, üniversite, mesafe ve paket tercihlerine göre daha anlamlı eşleşmeler alır.",
        },
        {
          title: "Kitap sosyal ağına katıl",
          text: "Akış, alıntı, profil, topluluk ve mesajlaşma özellikleri kitap paylaşımını sosyal bir deneyime dönüştürür.",
        },
      ]}
      faq={[
        {
          question: "KampüsRaf'ta sanal kütüphane oluşturulabilir mi?",
          answer:
            "Evet. Rafım alanında sahip olduğun kitapları listeleyebilir, paylaşım durumlarını yönetebilir ve kitaplarını daha düzenli takip edebilirsin.",
        },
        {
          question: "Eşleşme sistemi nasıl çalışır?",
          answer:
            "Eşleşme mantığı kitap isteği, kitap paylaşımı, mesafe, şehir, üniversite ve kullanıcı tercihleri gibi sinyalleri birlikte değerlendirir.",
        },
        {
          question: "KampüsRaf mobilde de kullanılabilir mi?",
          answer:
            "Evet. KampüsRaf web ve mobil deneyimi birlikte düşünülerek geliştirilmektedir; temel kitap, akış, profil ve harita deneyimleri mobil tarafa da uyarlanır.",
        },
      ]}
    />
  );
}
