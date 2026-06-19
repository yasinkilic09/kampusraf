export type GeoSeoFaq = {
  question: string;
  answer: string;
};

export type GeoSeoPage = {
  slug: string;
  city: string;
  region: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  universities: string[];
  title: string;
  shortTitle: string;
  description: string;
  keywords: string[];
  summary: string;
  localAngles: string[];
  deliveryIdeas: string[];
  faq: GeoSeoFaq[];
};

export const geoSeoPages: GeoSeoPage[] = [
  {
    slug: "istanbul-kitap-takas",
    city: "İstanbul",
    region: "Marmara",
    coordinates: { latitude: 41.0082, longitude: 28.9784 },
    universities: [
      "İstanbul Üniversitesi",
      "İstanbul Teknik Üniversitesi",
      "Marmara Üniversitesi",
      "Boğaziçi Üniversitesi",
      "Yıldız Teknik Üniversitesi",
    ],
    title: "İstanbul Kitap Takas ve Kampüs Kitap Paylaşımı",
    shortTitle: "İstanbul kitap takas",
    description:
      "İstanbul'da öğrenciler için kitap takas, ikinci el kitap, ödünç kitap ve yakındaki kitapları bulma rehberi. KampüsRaf ile İstanbul'daki açık rafları keşfet.",
    keywords: [
      "İstanbul kitap takas",
      "İstanbul ikinci el kitap",
      "İstanbul öğrenci kitap",
      "İstanbul yakın kitap",
    ],
    summary:
      "İstanbul'da kampüsler ve semtler birbirinden uzak olduğu için kitap aramada yakınlık, üniversite bilgisi ve teslim noktası önem kazanır. KampüsRaf, tam adres paylaşmadan yaklaşık konumla uygun kitapları keşfetmeyi hedefler.",
    localAngles: [
      "Avrupa ve Anadolu yakasında farklı kampüs yoğunlukları vardır.",
      "Ders kitapları dönem başında, roman ve kaynak kitaplar yıl boyunca daha sık aranır.",
      "Yaklaşık mesafe bilgisi, şehir içi ulaşım yükünü azaltan ilk filtre olabilir.",
    ],
    deliveryIdeas: [
      "Kampüs kütüphanesi veya fakülte girişi gibi kalabalık alanları tercih et.",
      "Kitap fotoğrafı, baskı ve kondisyon bilgisini buluşmadan önce netleştir.",
      "Teslim saatini toplu taşıma yoğunluğunu düşünerek planla.",
    ],
    faq: [
      {
        question: "İstanbul'da yakınımdaki kitapları nasıl bulabilirim?",
        answer:
          "Konum izni ve kitap görünürlüğü açıksa KampüsRaf, İstanbul'daki paylaşmaya açık kitapları yaklaşık mesafe mantığıyla keşfetmeyi kolaylaştırır.",
      },
      {
        question: "İstanbul'da kitap takası için tam adres paylaşmak gerekir mi?",
        answer:
          "Hayır. Önce uygulama içi mesajlaşma ve yaklaşık konumla iletişim kurulmalı, buluşma için güvenli ve ortak alanlar seçilmelidir.",
      },
    ],
  },
  {
    slug: "ankara-kitap-takas",
    city: "Ankara",
    region: "İç Anadolu",
    coordinates: { latitude: 39.9334, longitude: 32.8597 },
    universities: [
      "Ankara Üniversitesi",
      "Gazi Üniversitesi",
      "Hacettepe Üniversitesi",
      "ODTÜ",
      "Yıldırım Beyazıt Üniversitesi",
    ],
    title: "Ankara Kitap Takas ve Öğrenci Kitap Paylaşımı",
    shortTitle: "Ankara kitap takas",
    description:
      "Ankara'da öğrenciler için kitap takas, üniversite ders kitabı, ödünç kitap ve kampüs çevresinde yakın kitap keşfi rehberi.",
    keywords: [
      "Ankara kitap takas",
      "Ankara ikinci el kitap",
      "Ankara ders kitabı",
      "Ankara öğrenci kitap",
    ],
    summary:
      "Ankara'da üniversite bölgeleri ve öğrenci yoğunluğu kitap paylaşımı için güçlü bir yerel ağ oluşturur. KampüsRaf, ders kitabı ve kaynak kitap arayan öğrencileri şehir ve üniversite bağlamıyla buluşturmayı amaçlar.",
    localAngles: [
      "Ders kitapları ve akademik kaynaklar Ankara'da güçlü arama niyetidir.",
      "Üniversite filtresi, aynı dersi alan öğrencileri bulmayı kolaylaştırır.",
      "Yaklaşık mesafe, kampüsler arası ulaşımı planlamak için ilk sinyaldir.",
    ],
    deliveryIdeas: [
      "Kütüphane, metro çevresi veya kampüs ortak alanları daha pratik olabilir.",
      "Ders kodu, bölüm ve baskı yılını mesajlaşmada kontrol et.",
      "Ödünç kitaplarda teslim tarihini en başta belirle.",
    ],
    faq: [
      {
        question: "Ankara'da ders kitabı bulmak için KampüsRaf kullanılabilir mi?",
        answer:
          "Evet. Kullanıcılar ders kitaplarını rafa ekleyebilir, paylaşım türünü seçebilir ve Ankara'daki uygun kitaplarla eşleşebilir.",
      },
      {
        question: "Ankara'da kitap ödünç alma mümkün mü?",
        answer:
          "Kitap sahibi ödünç seçeneğini açtıysa uygulama içi mesajlaşma ile süre, teslim noktası ve kitap durumu konuşulabilir.",
      },
    ],
  },
  {
    slug: "izmir-kitap-takas",
    city: "İzmir",
    region: "Ege",
    coordinates: { latitude: 38.4237, longitude: 27.1428 },
    universities: [
      "Ege Üniversitesi",
      "Dokuz Eylül Üniversitesi",
      "İzmir Katip Çelebi Üniversitesi",
      "İzmir Ekonomi Üniversitesi",
    ],
    title: "İzmir Kitap Takas ve Yakındaki Kitaplar",
    shortTitle: "İzmir kitap takas",
    description:
      "İzmir'de kitap takası yapmak, ikinci el kitap bulmak, ödünç kitap aramak ve kampüs çevresindeki kitapları keşfetmek isteyen öğrenciler için rehber.",
    keywords: [
      "İzmir kitap takas",
      "İzmir ikinci el kitap",
      "İzmir yakın kitap",
      "İzmir öğrenci kitap",
    ],
    summary:
      "İzmir'de kampüs ve semt bağlantısı kitap teslimini daha planlı hale getirir. KampüsRaf, kitap sahibiyle kitap arayan öğrenciyi yakınlık ve paylaşım türü sinyalleriyle buluşturur.",
    localAngles: [
      "Bornova, Buca ve çevresindeki öğrenci yoğunluğu kitap dolaşımı için uygundur.",
      "Takas, satış, bağış ve ödünç seçenekleri farklı ihtiyaçlara cevap verir.",
      "Yakındaki kitaplar sayfası, şehir içi keşfi daha görünür hale getirir.",
    ],
    deliveryIdeas: [
      "Kampüs kapısı, kütüphane veya merkezi duraklar teslim için daha anlaşılır olabilir.",
      "Kitabın kondisyonunu fotoğrafla teyit et.",
      "Bağış veya ödünç kitaplarda beklentiyi açık yaz.",
    ],
    faq: [
      {
        question: "İzmir'de ikinci el kitap yerine takas yapabilir miyim?",
        answer:
          "Evet. KampüsRaf'ta kitap sahipleri takas seçeneğini açabilir; arayan kullanıcılar uygulama içinden mesajlaşabilir.",
      },
      {
        question: "İzmir'deki kitaplar haritada görünür mü?",
        answer:
          "Konum izni ve görünürlük açık olduğunda paylaşılabilir kitaplar yaklaşık konum mantığıyla keşfedilebilir.",
      },
    ],
  },
  {
    slug: "eskisehir-kitap-takas",
    city: "Eskişehir",
    region: "İç Anadolu",
    coordinates: { latitude: 39.7767, longitude: 30.5206 },
    universities: [
      "Anadolu Üniversitesi",
      "Eskişehir Osmangazi Üniversitesi",
      "Eskişehir Teknik Üniversitesi",
    ],
    title: "Eskişehir Kitap Takas ve Öğrenci Rafları",
    shortTitle: "Eskişehir kitap takas",
    description:
      "Eskişehir'de öğrenciler için kitap takas, ders kitabı bulma, ödünç kitap ve kampüs çevresinde yakın kitap keşfi rehberi.",
    keywords: [
      "Eskişehir kitap takas",
      "Eskişehir öğrenci kitap",
      "Eskişehir ikinci el kitap",
      "Eskişehir ders kitabı",
    ],
    summary:
      "Eskişehir öğrenci nüfusu yüksek ve kampüs yaşamı güçlü bir şehir olduğu için kitap paylaşımı doğal bir yerel ihtiyaçtır. KampüsRaf, bu ihtiyacı sanal raf ve yakın keşif mantığıyla düzenler.",
    localAngles: [
      "Öğrenci yoğunluğu kitap takasını daha hızlı hale getirebilir.",
      "Dönemlik ders kitapları için ödünç ve takas seçenekleri ekonomik çözüm sunar.",
      "Topluluklar okuma grupları ve kitap kulübü akışlarını destekleyebilir.",
    ],
    deliveryIdeas: [
      "Kampüs içi ortak alanlarda teslim planı yap.",
      "Ders kitabı için bölüm ve baskı bilgisini kontrol et.",
      "Kitap sahibinin profil ve güven sinyallerini incele.",
    ],
    faq: [
      {
        question: "Eskişehir'de öğrenci kitap paylaşımı için KampüsRaf uygun mu?",
        answer:
          "Evet. Eskişehir'deki öğrenciler kitaplarını sanal rafa ekleyip takas, ödünç, satış veya bağış seçenekleriyle paylaşabilir.",
      },
      {
        question: "Eskişehir'de kitap kulübü ve topluluklar kullanılabilir mi?",
        answer:
          "KampüsRaf topluluk ve sosyal akış özellikleriyle kitap etrafında öğrenci grupları oluşturmayı destekler.",
      },
    ],
  },
  {
    slug: "bursa-kitap-takas",
    city: "Bursa",
    region: "Marmara",
    coordinates: { latitude: 40.1885, longitude: 29.061 },
    universities: [
      "Bursa Uludağ Üniversitesi",
      "Bursa Teknik Üniversitesi",
      "Mudanya Üniversitesi",
    ],
    title: "Bursa Kitap Takas ve Kampüs Kitap Paylaşımı",
    shortTitle: "Bursa kitap takas",
    description:
      "Bursa'da üniversite öğrencileri için kitap takas, ikinci el kitap, ders kitabı ve yakındaki kitapları bulma rehberi.",
    keywords: [
      "Bursa kitap takas",
      "Bursa ikinci el kitap",
      "Bursa ders kitabı",
      "Bursa öğrenci kitap",
    ],
    summary:
      "Bursa'da kampüs ve şehir merkezi arasındaki mesafe, kitap aramada doğru filtrelerin önemini artırır. KampüsRaf şehir, üniversite ve yaklaşık mesafe sinyalleriyle kitap paylaşımını sadeleştirir.",
    localAngles: [
      "Ders kitabı ve kaynak kitap ihtiyacı dönem başlarında artabilir.",
      "Üniversite odaklı arama, doğru öğrenci ağına ulaşmayı kolaylaştırır.",
      "Bağış ve ödünç seçenekleri kitapların daha uzun süre kullanılmasını sağlar.",
    ],
    deliveryIdeas: [
      "Kampüs ortak alanlarını ve kolay ulaşım noktalarını tercih et.",
      "Kitap durumu ve teslim koşullarını mesajda yazılı bırak.",
      "Satış dışı takas seçeneklerini de konuş.",
    ],
    faq: [
      {
        question: "Bursa'da kitap takası nasıl başlatılır?",
        answer:
          "Kitap rafa eklenir, takas seçeneği açılır ve ilgilenen kullanıcılar uygulama içi mesajlaşma ile iletişime geçer.",
      },
      {
        question: "Bursa'da yakın kitap keşfi güvenli mi?",
        answer:
          "Yakın keşif tam adres yerine yaklaşık konum mantığıyla tasarlanır; buluşma detayı kullanıcıların güvenli tercihlerine bırakılır.",
      },
    ],
  },
  {
    slug: "antalya-kitap-takas",
    city: "Antalya",
    region: "Akdeniz",
    coordinates: { latitude: 36.8969, longitude: 30.7133 },
    universities: ["Akdeniz Üniversitesi", "Antalya Bilim Üniversitesi"],
    title: "Antalya Kitap Takas ve Yakın Kitap Keşfi",
    shortTitle: "Antalya kitap takas",
    description:
      "Antalya'da öğrenciler için kitap takas, ödünç kitap, ikinci el kitap ve kampüs çevresinde yakın kitap keşfi rehberi.",
    keywords: [
      "Antalya kitap takas",
      "Antalya ikinci el kitap",
      "Antalya öğrenci kitap",
      "Antalya yakın kitap",
    ],
    summary:
      "Antalya'da öğrenciler için kitap paylaşımı, kampüs çevresindeki ulaşılabilir rafları görünür kıldığında daha pratik hale gelir. KampüsRaf bu keşfi yaklaşık konum ve paylaşım türleriyle destekler.",
    localAngles: [
      "Kampüs çevresindeki öğrenciler için ders kitabı paylaşımı öncelikli olabilir.",
      "Bağış ve ödünç kitaplar dönemsel maliyeti azaltır.",
      "Sosyal akış ve topluluklar okuma arkadaşlığı kurmayı kolaylaştırır.",
    ],
    deliveryIdeas: [
      "Kalabalık kampüs noktalarında teslim planla.",
      "Ödünç kitaplarda iade tarihini netleştir.",
      "Kitap fotoğrafı ve kondisyon bilgisini önceden paylaş.",
    ],
    faq: [
      {
        question: "Antalya'da kitap bağışı KampüsRaf'ta görünür olur mu?",
        answer:
          "Kullanıcı kitap görünürlüğünü açarsa bağışa uygun kitaplar yakın keşifte veya arama sonuçlarında daha kolay fark edilebilir.",
      },
      {
        question: "Antalya'da kitap sahibiyle nasıl iletişim kurarım?",
        answer:
          "Kitap detayından veya eşleşme akışından uygulama içi mesajlaşma ile iletişim kurulabilir.",
      },
    ],
  },
  {
    slug: "konya-kitap-takas",
    city: "Konya",
    region: "İç Anadolu",
    coordinates: { latitude: 37.8746, longitude: 32.4932 },
    universities: [
      "Selçuk Üniversitesi",
      "Necmettin Erbakan Üniversitesi",
      "Konya Teknik Üniversitesi",
    ],
    title: "Konya Kitap Takas ve Üniversite Ders Kitapları",
    shortTitle: "Konya kitap takas",
    description:
      "Konya'da kitap takas, üniversite ders kitabı, ödünç kitap ve öğrenciler arası kitap paylaşımı için KampüsRaf rehberi.",
    keywords: [
      "Konya kitap takas",
      "Konya ders kitabı",
      "Konya ikinci el kitap",
      "Konya öğrenci kitap",
    ],
    summary:
      "Konya'da farklı üniversite bölgeleri arasında kitap dolaşımını düzenlemek için şehir, üniversite ve kitap durumu bilgisi önemlidir. KampüsRaf bu bilgileri tek sanal raf deneyiminde toplar.",
    localAngles: [
      "Ders kitabı ve akademik kaynak araması yüksek niyet taşır.",
      "Üniversite filtresi aynı bölümdeki öğrencileri bulmaya yardımcı olur.",
      "Satış, takas ve ödünç seçenekleri farklı bütçelere hitap eder.",
    ],
    deliveryIdeas: [
      "Bölüm, ders ve baskı bilgisini kontrol et.",
      "Ortak kampüs alanlarında teslim planı yap.",
      "Takas için beklediğin kitap türünü açık yaz.",
    ],
    faq: [
      {
        question: "Konya'da üniversite ders kitabı bulabilir miyim?",
        answer:
          "KampüsRaf'ta kullanıcılar ders kitaplarını ekleyip paylaşım türünü seçebilir; arayan öğrenciler şehir ve üniversite bağlamıyla keşfedebilir.",
      },
      {
        question: "Konya'da kitap takası ücretli mi?",
        answer:
          "Takas kullanıcıların anlaşmasına bağlıdır; platform kitap sahibiyle arayan kullanıcıyı uygulama içinde buluşturur.",
      },
    ],
  },
  {
    slug: "kocaeli-kitap-takas",
    city: "Kocaeli",
    region: "Marmara",
    coordinates: { latitude: 40.8533, longitude: 29.8815 },
    universities: ["Kocaeli Üniversitesi", "Gebze Teknik Üniversitesi"],
    title: "Kocaeli Kitap Takas ve Yakındaki Öğrenci Rafları",
    shortTitle: "Kocaeli kitap takas",
    description:
      "Kocaeli'de öğrenciler için kitap takası, ikinci el kitap, ödünç kitap ve kampüs çevresindeki açık rafları keşfetme rehberi.",
    keywords: [
      "Kocaeli kitap takas",
      "Kocaeli ikinci el kitap",
      "Gebze kitap takas",
      "Kocaeli öğrenci kitap",
    ],
    summary:
      "Kocaeli'de farklı ilçe ve kampüs yoğunlukları nedeniyle yakınlık sinyali kitap keşfinde önemlidir. KampüsRaf kitap paylaşımını şehir ve üniversite odağıyla daha düzenli hale getirir.",
    localAngles: [
      "Kocaeli ve Gebze çevresinde üniversite odaklı kitap aramaları ayrışabilir.",
      "Yaklaşık mesafe, kitap teslimini planlamada güçlü ilk filtredir.",
      "Ödünç ve bağış seçenekleri öğrenciler için ekonomik alternatif oluşturur.",
    ],
    deliveryIdeas: [
      "Kampüs veya merkezi ulaşım noktalarını tercih et.",
      "Kitap durumu ve baskı yılını konuşmadan teslim planı yapma.",
      "Yakınlık yanında kullanıcı profili ve güven sinyallerini de değerlendir.",
    ],
    faq: [
      {
        question: "Kocaeli'de Gebze çevresindeki kitaplar bulunabilir mi?",
        answer:
          "Kullanıcılar şehir, üniversite ve yaklaşık konum sinyalleriyle uygun kitapları keşfedebilir; sonuçlar görünürlüğü açık kitaplara bağlıdır.",
      },
      {
        question: "Kocaeli'de kitap ödünç vermek mümkün mü?",
        answer:
          "Evet. Kitap sahibi ödünç seçeneğini açarsa arayan öğrenci uygulama içinden iletişim kurabilir.",
      },
    ],
  },
  {
    slug: "kayseri-kitap-takas",
    city: "Kayseri",
    region: "İç Anadolu",
    coordinates: { latitude: 38.7205, longitude: 35.4826 },
    universities: [
      "Erciyes Üniversitesi",
      "Kayseri Üniversitesi",
      "Nuh Naci Yazgan Üniversitesi",
    ],
    title: "Kayseri Kitap Takas ve Öğrenci Kitap Paylaşımı",
    shortTitle: "Kayseri kitap takas",
    description:
      "Kayseri'de öğrenciler için kitap takas, ders kitabı, ikinci el kitap ve kampüs çevresinde yakın kitap keşfi rehberi.",
    keywords: [
      "Kayseri kitap takas",
      "Kayseri ders kitabı",
      "Kayseri ikinci el kitap",
      "Kayseri öğrenci kitap",
    ],
    summary:
      "Kayseri'de kampüs çevresindeki kitap ihtiyacını görünür kılmak, ders kitabı ve kaynak kitap arayan öğrenciler için zaman kazandırır. KampüsRaf kitapları sanal raf ve yakın keşifle dolaşıma sokar.",
    localAngles: [
      "Ders kitabı ve sınav kaynakları dönemsel olarak daha hızlı aranabilir.",
      "Takas ve ödünç seçenekleri tek kullanımlık kitap maliyetini azaltır.",
      "Sanal raf, öğrencinin elindeki kaynakları düzenli gösterir.",
    ],
    deliveryIdeas: [
      "Kitap durumunu ve teslim tarihini mesajda netleştir.",
      "Kampüs içi ortak alanları tercih et.",
      "Kitap sahibiyle önce uygulama içinde konuş.",
    ],
    faq: [
      {
        question: "Kayseri'de ders kitabı takası yapılabilir mi?",
        answer:
          "Evet. Ders kitabı sahibi kitabı takasa açarsa arayan öğrenciler uygulama içinden iletişime geçebilir.",
      },
      {
        question: "Kayseri'de bağış kitaplar nasıl bulunur?",
        answer:
          "Kitaplar bağış seçeneğiyle rafa eklenirse arama ve yakın keşif akışlarında daha net görünür hale gelir.",
      },
    ],
  },
  {
    slug: "trabzon-kitap-takas",
    city: "Trabzon",
    region: "Karadeniz",
    coordinates: { latitude: 41.0027, longitude: 39.7168 },
    universities: [
      "Karadeniz Teknik Üniversitesi",
      "Trabzon Üniversitesi",
      "Avrasya Üniversitesi",
    ],
    title: "Trabzon Kitap Takas ve Kampüs Kitap Paylaşımı",
    shortTitle: "Trabzon kitap takas",
    description:
      "Trabzon'da öğrenciler için kitap takası, ikinci el kitap, ödünç kitap ve kampüs çevresinde yakın kitap keşfi rehberi.",
    keywords: [
      "Trabzon kitap takas",
      "Trabzon ikinci el kitap",
      "Trabzon öğrenci kitap",
      "Trabzon ders kitabı",
    ],
    summary:
      "Trabzon'da kampüs çevresinde kitap paylaşımı, özellikle ders kaynakları ve okuma kitaplarında yerel öğrenci ağını güçlendirir. KampüsRaf bu ağı sanal raf ve mesajlaşma akışıyla destekler.",
    localAngles: [
      "Kampüs yoğunluğu kitap arayan ve kitap sahibi öğrencileri buluşturabilir.",
      "Yakınlık sinyali teslimi kolaylaştırır ama tam adres paylaşımı amaçlanmaz.",
      "Topluluklar ve sosyal akış okuma deneyimini şehir içinde görünür yapar.",
    ],
    deliveryIdeas: [
      "Kütüphane, fakülte girişi veya ortak öğrenci alanlarını tercih et.",
      "Kitap görseli ve kondisyon bilgisini önceden iste.",
      "Takas veya ödünç koşullarını mesajda netleştir.",
    ],
    faq: [
      {
        question: "Trabzon'da öğrenciler arası kitap takası yapılabilir mi?",
        answer:
          "Evet. KampüsRaf'ta kitap sahibi paylaşım türünü seçer, arayan öğrenci de uygulama içinden iletişime geçebilir.",
      },
      {
        question: "Trabzon'da yakındaki kitaplar tam adres gösterir mi?",
        answer:
          "Hayır. Yakın keşif tam adres göstermek yerine yaklaşık konum ve kullanıcı kontrolü mantığıyla tasarlanır.",
      },
    ],
  },
];

export const geoSeoHubFaq: GeoSeoFaq[] = [
  {
    question: "KampüsRaf şehir bazlı kitap takas için nasıl çalışır?",
    answer:
      "Kullanıcı kitabını rafa ekler, paylaşım türünü seçer ve konum/şehir bilgisi uygunsa yakındaki öğrenciler kitabı keşfedebilir.",
  },
  {
    question: "Yakındaki kitaplar tam adresimi gösterir mi?",
    answer:
      "Hayır. KampüsRaf yakın keşfi tam adres yerine yaklaşık konum ve kullanıcı kontrollü görünürlük mantığıyla tasarlar.",
  },
  {
    question: "Her şehirde kitap görünür mü?",
    answer:
      "Görünürlük, o şehirde kullanıcıların kitap eklemesine ve paylaşım türünü açık hale getirmesine bağlıdır. Yeni kullanıcılar eklendikçe yerel raf büyür.",
  },
];

export function getGeoSeoPage(slug: string) {
  return geoSeoPages.find((page) => page.slug === slug);
}

export function getRelatedGeoSeoPages(page: GeoSeoPage) {
  return geoSeoPages
    .filter((geoPage) => geoPage.slug !== page.slug)
    .slice(0, 3);
}
