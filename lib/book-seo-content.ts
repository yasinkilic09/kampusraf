export type BookSeoSection = {
  title: string;
  text: string;
};

export type BookSeoFaq = {
  question: string;
  answer: string;
};

export type BookSeoPage = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  intent: string;
  keywords: string[];
  summary: string;
  sections: BookSeoSection[];
  faq: BookSeoFaq[];
  relatedSlugs: string[];
};

export const bookSeoPages: BookSeoPage[] = [
  {
    slug: "ikinci-el-kitap",
    title: "İkinci El Kitap Bulma ve Paylaşma Rehberi",
    shortTitle: "İkinci el kitap",
    description:
      "İkinci el kitap arayan öğrenciler için uygun fiyatlı, güvenli ve kampüs odaklı kitap bulma yolları. KampüsRaf ile yakındaki kitapları keşfet.",
    intent: "Uygun fiyatlı ikinci el kitap bulmak isteyen öğrenci",
    keywords: [
      "ikinci el kitap",
      "ikinci el kitap bul",
      "öğrenci ikinci el kitap",
      "uygun fiyatlı kitap",
    ],
    summary:
      "İkinci el kitap ararken en önemli şey kitabın durumunu, paylaşım türünü ve sahibinin güvenilirliğini hızlıca görebilmektir. KampüsRaf bu süreci öğrenciler için kampüs ve yakın konum odağıyla sadeleştirir.",
    sections: [
      {
        title: "Kitabın durumunu baştan netleştir",
        text: "İkinci el kitaplarda kapak, sayfa, not alma ve baskı bilgisi önemlidir. KampüsRaf'ta kitap eklerken bu detayları görünür kılmak, gereksiz mesajlaşmayı azaltır ve doğru eşleşmeyi hızlandırır.",
      },
      {
        title: "Yakın konumdaki seçeneklere bak",
        text: "Aynı şehirde veya kampüste bulunan kitaplar hem teslimatı kolaylaştırır hem de güven hissini artırır. Harita ve yaklaşık mesafe mantığı, tam adres paylaşmadan yakın kitapları keşfetmeye yardım eder.",
      },
      {
        title: "Satın alma dışında takas ve ödünç seçeneklerini düşün",
        text: "Her kitap için para harcamak gerekmeyebilir. Bazı kitaplar takas, ödünç veya bağış şeklinde paylaşılabilir. Bu seçenekler özellikle dönemlik ders kitaplarında öğrencinin yükünü azaltır.",
      },
    ],
    faq: [
      {
        question: "İkinci el kitap alırken nelere dikkat edilir?",
        answer:
          "Kitabın baskısı, sayfa durumu, eksik sayfa olup olmadığı, not veya işaretleme durumu ve teslim yöntemi kontrol edilmelidir.",
      },
      {
        question: "KampüsRaf ikinci el kitap satışı yapar mı?",
        answer:
          "KampüsRaf bir kitap paylaşım platformudur. Kullanıcılar kitaplarını satışa, takasa, ödünce veya bağışa açabilir.",
      },
      {
        question: "Yakınımdaki ikinci el kitapları görebilir miyim?",
        answer:
          "Konum izni verildiğinde ve kitap paylaşım görünürlüğü açıksa, yakındaki uygun kitaplar yaklaşık mesafeyle keşfedilebilir.",
      },
    ],
    relatedSlugs: [
      "kitap-takasi-nasil-yapilir",
      "universite-ders-kitabi",
      "yakindaki-kitaplar",
    ],
  },
  {
    slug: "kitap-takasi-nasil-yapilir",
    title: "Kitap Takası Nasıl Yapılır?",
    shortTitle: "Kitap takası",
    description:
      "Kitap takası yapmak isteyen öğrenciler için güvenli süreç, mesajlaşma, kitap durumu kontrolü ve kampüs içi buluşma önerileri.",
    intent: "Kitabını başka bir kitapla değiştirmek isteyen kullanıcı",
    keywords: [
      "kitap takası nasıl yapılır",
      "kitap takas",
      "öğrenciler arası kitap takası",
      "kampüs kitap takası",
    ],
    summary:
      "Kitap takası, rafta bekleyen kitapları başka bir öğrencinin ihtiyacıyla buluşturur. Doğru takas için paylaşım türü, kitap durumu ve iletişim akışı açık olmalıdır.",
    sections: [
      {
        title: "Kitabı takasa açık işaretle",
        text: "Kitabın yalnızca listelenmesi yeterli değildir. Takas, ödünç, satış veya bağış seçeneklerinden doğru paylaşım türü seçilirse arayan kişiler beklentiyi en baştan anlar.",
      },
      {
        title: "Beklediğin kitap türünü belirt",
        text: "Ders kitabı, roman, sınav hazırlık kitabı veya akademik kaynak gibi beklentileri açıklamak daha anlamlı eşleşmeler üretir. Net beklenti, pazarlık ve mesaj yükünü azaltır.",
      },
      {
        title: "Uygulama içi iletişimle anlaş",
        text: "Takas öncesi kitap fotoğrafı, baskı bilgisi ve teslim noktası konuşulmalıdır. KampüsRaf'ta mesajlaşmanın uygulama içinde kalması süreci daha kontrollü hale getirir.",
      },
    ],
    faq: [
      {
        question: "Kitap takası ücretli mi?",
        answer:
          "Takasın kendisi kullanıcıların anlaşmasına bağlıdır. KampüsRaf temel kitap ekleme ve keşif akışını öğrenciler için erişilebilir tutar.",
      },
      {
        question: "Her kitap takasa uygun mu?",
        answer:
          "Kitabın durumu iyi, bilgileri açık ve sahibi takasa istekliyse uygundur. Zorunlu ders kitapları dönem içinde daha hızlı ilgi görebilir.",
      },
      {
        question: "Takas için tam adres paylaşmak gerekir mi?",
        answer:
          "Hayır. Yaklaşık konum ve uygulama içi mesajlaşma ile önce güvenli iletişim kurulabilir, sonrasında taraflar uygun bir buluşma noktası seçebilir.",
      },
    ],
    relatedSlugs: ["ikinci-el-kitap", "kitap-odunc-alma", "sanal-kutuphane"],
  },
  {
    slug: "kitap-odunc-alma",
    title: "Kitap Ödünç Alma Rehberi",
    shortTitle: "Kitap ödünç alma",
    description:
      "Kısa süreli ihtiyaçlar için kitap ödünç alma, teslim tarihi belirleme, kitap sahibine güven verme ve öğrenciler arası kitap dolaşımı rehberi.",
    intent: "Kitabı satın almadan kısa süre kullanmak isteyen öğrenci",
    keywords: [
      "kitap ödünç alma",
      "kitap ödünç verme",
      "öğrenci kitap ödünç",
      "kampüste kitap ödünç",
    ],
    summary:
      "Ödünç kitap modeli, özellikle dönemlik kaynaklarda maliyeti düşürür. KampüsRaf ödünç alma sürecini görünür kitap bilgisi, mesajlaşma ve kullanıcı profiliyle daha düzenli hale getirir.",
    sections: [
      {
        title: "Teslim tarihini en başta konuş",
        text: "Ödünç kitaplarda en büyük risk belirsiz teslim tarihidir. Süre, teslim noktası ve kitabın nasıl korunacağı mesajlaşma sırasında netleştirilmelidir.",
      },
      {
        title: "Kitabın mevcut durumunu kaydet",
        text: "Kitap teslim edilmeden önce fotoğraf ve notlarla durum bilgisi paylaşmak iki taraf için de güven sağlar. Böylece geri teslimde anlaşmazlık ihtimali azalır.",
      },
      {
        title: "Kampüs içi dolaşımı kolaylaştır",
        text: "Yakın çevrede ödünç kitap bulmak, özellikle kısa sürede ihtiyaç duyulan ders kaynaklarında kullanıcıya hız kazandırır.",
      },
    ],
    faq: [
      {
        question: "Kitap ödünç alırken depozito gerekir mi?",
        answer:
          "Bu tamamen kullanıcıların anlaşmasına bağlıdır. KampüsRaf, tarafların uygulama içinden konuşarak şartları netleştirmesine yardımcı olur.",
      },
      {
        question: "Ödünç kitap geç teslim edilirse ne olur?",
        answer:
          "Teslim tarihi ve koşullar önceden konuşulmalıdır. Platform tarafında güven sinyalleri ve profil geçmişi geliştikçe bu süreç daha izlenebilir hale gelir.",
      },
      {
        question: "Ders kitabı ödünç almak mantıklı mı?",
        answer:
          "Kısa süreli proje, sınav veya konu tekrarı için ders kitabı ödünç almak ekonomik ve pratik bir çözümdür.",
      },
    ],
    relatedSlugs: [
      "universite-ders-kitabi",
      "kitap-takasi-nasil-yapilir",
      "kitap-bagisi",
    ],
  },
  {
    slug: "kitap-bagisi",
    title: "Kitap Bağışı Nasıl Yapılır?",
    shortTitle: "Kitap bağışı",
    description:
      "Kullanılmayan kitapları öğrencilerle buluşturmak için kitap bağışı rehberi. Bağışa uygun kitaplar, görünürlük ve güvenli teslim önerileri.",
    intent: "Kitaplarını ücretsiz paylaşmak isteyen kullanıcı",
    keywords: [
      "kitap bağışı",
      "kitap bağışı yap",
      "öğrencilere kitap bağışı",
      "kitap paylaşımı",
    ],
    summary:
      "Kitap bağışı, kullanılmayan kaynakların yeni okuyuculara ulaşmasını sağlar. KampüsRaf bağışa açık kitapları öğrencilerin keşfedebileceği bir sosyal rafa dönüştürür.",
    sections: [
      {
        title: "Bağışa uygun kitapları seç",
        text: "Okunabilir durumda olan ders kitapları, romanlar, denemeler, sınav kaynakları ve akademik kitaplar bağış için değerlidir. Eksik veya ağır hasarlı kitaplar açıklamada belirtilmelidir.",
      },
      {
        title: "Kitabı doğru kategoriyle görünür yap",
        text: "Bağış seçeneği açık olan kitaplar, arayan öğrenciler için daha net bir beklenti oluşturur. Bu netlik hem arama hem de harita keşfi için önemlidir.",
      },
      {
        title: "Teslimi güvenli ve pratik planla",
        text: "Kampüs, kütüphane, fakülte girişi veya kalabalık ortak alanlar kitap teslimi için daha rahat seçenekler olabilir.",
      },
    ],
    faq: [
      {
        question: "Hangi kitaplar bağışlanabilir?",
        answer:
          "Okunabilir durumda olan ders kitabı, roman, kaynak kitap, sınav kitabı ve akademik yayınlar bağışlanabilir.",
      },
      {
        question: "Kitap bağışı için ücret alınır mı?",
        answer:
          "Bağış seçeneğinde amaç kitabı ücretsiz dolaşıma sokmaktır. Satış yapmak isteyen kullanıcı kitap paylaşım türünü satış olarak seçmelidir.",
      },
      {
        question: "Bağış kitapları haritada görünür mü?",
        answer:
          "Kullanıcı konum izni verir ve kitap görünürlüğünü açarsa bağışa açık kitaplar yakın keşifte listelenebilir.",
      },
    ],
    relatedSlugs: ["kitap-odunc-alma", "yakindaki-kitaplar", "sanal-kutuphane"],
  },
  {
    slug: "universite-ders-kitabi",
    title: "Üniversite Ders Kitabı Bulma Rehberi",
    shortTitle: "Üniversite ders kitabı",
    description:
      "Üniversite ders kitaplarını daha uygun ve hızlı bulmak için takas, ikinci el, ödünç alma ve kampüs içi kitap paylaşımı önerileri.",
    intent: "Dönemlik ders kitabı arayan üniversite öğrencisi",
    keywords: [
      "üniversite ders kitabı",
      "ders kitabı bul",
      "öğrenci ders kitabı",
      "ikinci el ders kitabı",
    ],
    summary:
      "Üniversite ders kitapları dönem başında hızlı tükenebilir veya pahalı olabilir. KampüsRaf aynı dersi alan öğrenciler arasında kitap dolaşımını kolaylaştırmayı hedefler.",
    sections: [
      {
        title: "Ders, bölüm ve baskı bilgisini kontrol et",
        text: "Ders kitaplarında baskı yılı ve bölüm uyumu önemlidir. Yanlış baskı, içerik farkı yaratabilir. Kitap açıklamasında bu bilgiler açık olmalıdır.",
      },
      {
        title: "Dönem başında erken arama yap",
        text: "Ders kitabı talebi dönem başında yoğunlaşır. Kitabı erken aramak veya aradığım kitap listesine eklemek eşleşme şansını artırır.",
      },
      {
        title: "Takas ve ödünç seçeneklerini kullan",
        text: "Bir dönem kullanılacak kitaplar için takas veya ödünç alma ekonomik olabilir. Böylece aynı kaynak farklı öğrenciler arasında dolaşır.",
      },
    ],
    faq: [
      {
        question: "Ders kitabı alırken baskı önemli mi?",
        answer:
          "Evet. Bazı derslerde baskı farkı konu sırası, bölüm veya sayfa numarası açısından önemli olabilir.",
      },
      {
        question: "KampüsRaf ders kitabı bulmaya yardımcı olur mu?",
        answer:
          "Evet. Kullanıcılar ders kitaplarını raflarına ekleyebilir, paylaşım türünü seçebilir ve yakınındaki öğrencilerle iletişime geçebilir.",
      },
      {
        question: "Ders kitabını dönem sonunda paylaşabilir miyim?",
        answer:
          "Evet. Kitap artık sende beklemeyecekse takas, satış, ödünç veya bağış seçenekleriyle yeniden dolaşıma çıkarabilirsin.",
      },
    ],
    relatedSlugs: [
      "ikinci-el-kitap",
      "kitap-odunc-alma",
      "ogrenciler-icin-kitap-satisi",
    ],
  },
  {
    slug: "yakindaki-kitaplar",
    title: "Yakınımdaki Kitapları Bulma Rehberi",
    shortTitle: "Yakındaki kitaplar",
    description:
      "Konuma göre yakındaki kitapları bulma, yaklaşık mesafe, harita görünümü ve güvenli iletişim mantığı. KampüsRaf ile yakın kitap keşfi.",
    intent: "Konumuna yakın kitapları keşfetmek isteyen kullanıcı",
    keywords: [
      "yakınımdaki kitaplar",
      "yakındaki kitapları bul",
      "konuma göre kitap",
      "haritada kitap bul",
    ],
    summary:
      "Yakındaki kitap keşfi, kitabı arayan kullanıcıyla paylaşmaya açık kitabı aynı yerel bağlamda buluşturur. Amaç tam adres göstermek değil, yakın olasılıkları keşfedilebilir kılmaktır.",
    sections: [
      {
        title: "Konum iznini kontrollü kullan",
        text: "KampüsRaf yakın kitap deneyimini yaklaşık mesafe üzerinden tasarlar. Kullanıcılar kitap görünürlüğünü ve konum iznini kendi tercihine göre yönetebilir.",
      },
      {
        title: "Haritada paylaşım türlerini ayır",
        text: "Takas, ödünç, satış ve bağış seçenekleri farklı beklentiler doğurur. Harita deneyiminde bu türleri ayırmak daha hızlı karar vermeyi sağlar.",
      },
      {
        title: "Yakınlık tek kriter değildir",
        text: "En yakın kitap her zaman en doğru seçenek olmayabilir. Kitabın durumu, baskısı, sahibiyle iletişim ve teslim koşulları da değerlendirilmelidir.",
      },
    ],
    faq: [
      {
        question: "KampüsRaf tam konumumu gösterir mi?",
        answer:
          "Hayır. Harita deneyimi tam adres paylaşmak için değil, yakın kitapları yaklaşık konum mantığıyla keşfetmek için tasarlanır.",
      },
      {
        question: "Yakınımdaki kitaplar neden görünmeyebilir?",
        answer:
          "Yakında paylaşım görünürlüğü açık kitap olmayabilir veya konum izni verilmemiş olabilir. Yeni kitaplar eklendikçe sonuçlar değişir.",
      },
      {
        question: "Yakındaki kitap sahibiyle nasıl iletişim kurarım?",
        answer:
          "Kitap detayından veya eşleşme akışından uygulama içi mesajlaşma ile iletişim kurulabilir.",
      },
    ],
    relatedSlugs: [
      "kitap-takasi-nasil-yapilir",
      "kitap-bagisi",
      "universite-ders-kitabi",
    ],
  },
  {
    slug: "kitap-okuma-toplulugu",
    title: "Kitap Okuma Topluluğu Kurma Rehberi",
    shortTitle: "Kitap topluluğu",
    description:
      "Kitap okuma topluluğu oluşturmak, kampüs içinde okuma grupları kurmak, alıntı ve gönderilerle sosyal okuma deneyimi geliştirmek için rehber.",
    intent: "Kitap etrafında topluluk ve okuma grubu arayan kullanıcı",
    keywords: [
      "kitap okuma topluluğu",
      "okuma grubu",
      "kampüs okuma topluluğu",
      "kitap kulübü",
    ],
    summary:
      "Kitaplar yalnızca okunmaz, konuşulur ve paylaşılır. KampüsRaf topluluklar, sosyal akış, alıntılar ve mesajlaşma ile okuma deneyimini tekil bir eylem olmaktan çıkarır.",
    sections: [
      {
        title: "Topluluğun konusunu netleştir",
        text: "Roman, felsefe, psikoloji, ders kaynakları veya sınav hazırlığı gibi odaklar topluluğun kimlere hitap ettiğini belirginleştirir.",
      },
      {
        title: "Okuma ritmi oluştur",
        text: "Haftalık bölüm, aylık kitap veya kısa alıntı tartışmaları topluluğun canlı kalmasını sağlar. Kullanıcıların katılabileceği net ritimler önemlidir.",
      },
      {
        title: "Alıntı ve gönderilerle etkileşim üret",
        text: "Bir kitapla ilgili düşünce, alıntı ve soru paylaşmak yeni üyelerin sohbete katılmasını kolaylaştırır.",
      },
    ],
    faq: [
      {
        question: "KampüsRaf kitap kulübü için kullanılabilir mi?",
        answer:
          "Evet. Topluluklar, sosyal akış ve mesajlaşma özellikleri kitap kulübü veya okuma grubu düzenlemek için kullanılabilir.",
      },
      {
        question: "Topluluklar sadece üniversite öğrencileri için mi?",
        answer:
          "KampüsRaf öğrenci odağıyla tasarlanmıştır, ancak kitap ve okuma etrafında buluşmak isteyen topluluklar için de uygundur.",
      },
      {
        question: "Toplulukta kitap paylaşımı yapılabilir mi?",
        answer:
          "Evet. Kullanıcılar kitaplarını rafa ekleyip paylaşım türünü seçerek topluluk içindeki okuyuculara da görünür olabilir.",
      },
    ],
    relatedSlugs: [
      "kitap-alinti-paylasimi",
      "sanal-kutuphane",
      "yakindaki-kitaplar",
    ],
  },
  {
    slug: "kitap-alinti-paylasimi",
    title: "Kitap Alıntısı Paylaşımı Rehberi",
    shortTitle: "Kitap alıntısı",
    description:
      "Kitap alıntısı paylaşırken anlamlı, kısa ve sosyal etkileşim üreten içerikler hazırlama rehberi. KampüsRaf sosyal okuma akışı.",
    intent: "Okuduğu kitaptan kısa alıntı veya düşünce paylaşmak isteyen kullanıcı",
    keywords: [
      "kitap alıntısı",
      "kitap alıntısı paylaş",
      "kitap sözleri",
      "sosyal okuma",
    ],
    summary:
      "Kitap alıntıları, okuma deneyimini paylaşılabilir hale getirir. KampüsRaf alıntı, gönderi ve Rastgele Raf deneyimiyle okurlar arasında günlük keşif üretir.",
    sections: [
      {
        title: "Kısa ve bağlamlı alıntı seç",
        text: "Paylaşılan alıntının kısa, anlaşılır ve kitabın ruhunu yansıtan bir bölümden seçilmesi etkileşimi artırır. Uzun metinler yerine düşünce başlatan cümleler daha etkilidir.",
      },
      {
        title: "Kendi yorumunu ekle",
        text: "Alıntının yanında kısa bir kişisel yorum, diğer kullanıcıların cevap vermesini kolaylaştırır. Sosyal okuma, yalnızca metni değil düşünceyi de dolaşıma sokar.",
      },
      {
        title: "Keşfi günlük alışkanlığa dönüştür",
        text: "Rastgele Raf gibi küçük keşif akışları, kullanıcıların her gün yeni bir cümle veya kitapla karşılaşmasını sağlar.",
      },
    ],
    faq: [
      {
        question: "Kitap alıntısı paylaşırken nelere dikkat edilir?",
        answer:
          "Alıntı kısa tutulmalı, kaynak kitap belirtilmeli ve mümkünse kişisel yorumla desteklenmelidir.",
      },
      {
        question: "KampüsRaf'ta alıntı keşfi var mı?",
        answer:
          "Evet. Rastgele Raf ve sosyal akış, kullanıcıların kitaplardan kısa alıntılar keşfetmesini ve paylaşmasını destekler.",
      },
      {
        question: "Alıntı paylaşımı kitap keşfine yardımcı olur mu?",
        answer:
          "Evet. İyi seçilmiş bir alıntı, kullanıcıların yeni kitaplara ilgi duymasını sağlayabilir.",
      },
    ],
    relatedSlugs: [
      "kitap-okuma-toplulugu",
      "sanal-kutuphane",
      "ikinci-el-kitap",
    ],
  },
  {
    slug: "ogrenciler-icin-kitap-satisi",
    title: "Öğrenciler İçin Kitap Satışı Rehberi",
    shortTitle: "Kitap satışı",
    description:
      "Öğrencilerin kullanmadığı kitapları satışa açması, fiyat belirlemesi, kitap durumunu açıklaması ve güvenli iletişim kurması için rehber.",
    intent: "Kullanmadığı kitabı satmak isteyen öğrenci",
    keywords: [
      "kitap satışı",
      "öğrenci kitap satışı",
      "ikinci el kitap sat",
      "ders kitabı sat",
    ],
    summary:
      "Kitap satışı, öğrencinin kullanmadığı kaynağı yeniden değerlendirmesini sağlar. Doğru fiyat, net açıklama ve güvenli mesajlaşma satış şansını artırır.",
    sections: [
      {
        title: "Fiyatı kitabın durumuna göre belirle",
        text: "Yeni, az kullanılmış, not alınmış veya yıpranmış kitaplar aynı değerde değildir. Açık ve adil fiyat, daha hızlı dönüş almayı sağlar.",
      },
      {
        title: "Fotoğraf ve açıklama ekle",
        text: "Kapak, iç sayfa, varsa notlar ve baskı bilgisi alıcı için önemlidir. Detaylı açıklama güven hissi oluşturur.",
      },
      {
        title: "Satış dışında alternatifleri de sun",
        text: "Bazı kullanıcılar kitabı satın almak yerine takas veya ödünç almak isteyebilir. Birden fazla paylaşım türü daha geniş kitleye ulaşmayı sağlar.",
      },
    ],
    faq: [
      {
        question: "KampüsRaf'ta kitap satabilir miyim?",
        answer:
          "Evet. Kitabını eklerken satış seçeneğini açabilir ve ilgilenen kullanıcılarla uygulama içinden iletişime geçebilirsin.",
      },
      {
        question: "Ders kitabı fiyatı nasıl belirlenir?",
        answer:
          "Baskı yılı, kondisyon, piyasadaki güncel fiyat ve dönemsel talep dikkate alınmalıdır.",
      },
      {
        question: "Satış için güvenli iletişim nasıl kurulur?",
        answer:
          "Önce uygulama içi mesajlaşma kullanılmalı, kitap bilgileri netleştirilmeli ve teslim için ortak, güvenli alanlar tercih edilmelidir.",
      },
    ],
    relatedSlugs: [
      "ikinci-el-kitap",
      "universite-ders-kitabi",
      "yakindaki-kitaplar",
    ],
  },
  {
    slug: "sanal-kutuphane",
    title: "Sanal Kütüphane Oluşturma Rehberi",
    shortTitle: "Sanal kütüphane",
    description:
      "Kendi sanal kütüphaneni oluşturmak, okuduğun ve paylaşabileceğin kitapları düzenlemek, kitaplarını görünür hale getirmek için rehber.",
    intent: "Kişisel kitap rafını dijital olarak düzenlemek isteyen kullanıcı",
    keywords: [
      "sanal kütüphane",
      "kişisel kitaplık",
      "kitap rafı uygulaması",
      "kitaplarımı düzenle",
    ],
    summary:
      "Sanal kütüphane, kullanıcının okuduğu, elinde tuttuğu ve paylaşabileceği kitapları düzenli şekilde yönetmesini sağlar. KampüsRaf sanal rafı sosyal paylaşım ve yakın keşifle birleştirir.",
    sections: [
      {
        title: "Kitaplarını tek rafta düzenle",
        text: "Okuduğun, okumak istediğin ve paylaşabileceğin kitapları düzenli görmek hem kişisel takip hem de sosyal keşif için güçlü bir başlangıçtır.",
      },
      {
        title: "Paylaşım durumunu belirle",
        text: "Her kitap paylaşılmak zorunda değildir. Takas, ödünç, satış, bağış veya yalnızca kişisel raf gibi durumlar kitabın görünürlüğünü yönetir.",
      },
      {
        title: "Rafını sosyal deneyime dönüştür",
        text: "Sanal kütüphane yalnızca liste değildir. Alıntılar, gönderiler, topluluklar ve eşleşmelerle kitaplar üzerinden yeni bağlantılar kurulabilir.",
      },
    ],
    faq: [
      {
        question: "Sanal kütüphane ne işe yarar?",
        answer:
          "Kitaplarını dijital olarak düzenlemeye, hangi kitapları paylaşabileceğini belirlemeye ve okuma geçmişini daha görünür tutmaya yarar.",
      },
      {
        question: "KampüsRaf kitap rafı uygulaması mı?",
        answer:
          "KampüsRaf sanal raf özelliği sunar, ancak bunun yanında takas, ödünç, harita, topluluk ve sosyal akış gibi özellikleri de birleştirir.",
      },
      {
        question: "Rafımdaki her kitap herkese görünür mü?",
        answer:
          "Hayır. Kitapların görünürlüğü ve paylaşım türü kullanıcı tercihleriyle yönetilmelidir.",
      },
    ],
    relatedSlugs: [
      "kitap-okuma-toplulugu",
      "kitap-alinti-paylasimi",
      "kitap-takasi-nasil-yapilir",
    ],
  },
];

export const bookSeoHubFaq: BookSeoFaq[] = [
  {
    question: "KampüsRaf kitap arayanlara nasıl yardımcı olur?",
    answer:
      "KampüsRaf, öğrencilerin kitapları takas, ödünç, satış veya bağış seçenekleriyle paylaşmasını ve yakınındaki kitapları keşfetmesini sağlar.",
  },
  {
    question: "KampüsRaf sadece ikinci el kitap sitesi mi?",
    answer:
      "Hayır. KampüsRaf ikinci el kitap arama yanında sanal kütüphane, sosyal akış, alıntı paylaşımı, topluluk, harita ve eşleşme özelliklerini birleştirir.",
  },
  {
    question: "Kitaplar Google'da nasıl daha görünür olur?",
    answer:
      "Açık başlık, açıklama, kategori, kitap durumu ve paylaşım türü olan sayfalar hem kullanıcılar hem de arama motorları için daha anlaşılır olur.",
  },
];

export function getBookSeoPage(slug: string) {
  return bookSeoPages.find((page) => page.slug === slug);
}

export function getRelatedBookSeoPages(page: BookSeoPage) {
  return page.relatedSlugs
    .map((slug) => getBookSeoPage(slug))
    .filter((relatedPage): relatedPage is BookSeoPage => Boolean(relatedPage));
}
