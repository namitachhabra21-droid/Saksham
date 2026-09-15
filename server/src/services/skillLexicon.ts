/**
 * Maps informal / traditional-occupation skill phrases — as people actually say
 * them in native languages (often transliterated by an STT engine) — to a
 * normalized skill token. The normalized token is then matched against
 * NsqfQualification.keywords to find the formal NSQF qualification.
 *
 * This is deliberately a transparent, editable lexicon so the mapping is
 * explainable to auditors and can be extended by domain experts without code.
 */

export interface LexiconEntry {
  normalized: string;
  /** substrings (lowercased, transliteration-tolerant) that indicate this skill */
  patterns: string[];
  /**
   * Formal vocabulary as it appears in NQR qualification and PM-AJAY course
   * TITLES — e.g. pottery is "Kumhar"/"terracotta" in speech but "Potter" in a
   * title, and beekeeping is "madhumakhi palan" in speech but "Honey bee
   * Farmer" in a title. Used only by scripts/link-*-keywords.ts to attach this
   * concept to catalogue rows; never used to interpret what a beneficiary says
   * (that is what `patterns` is for), so adding a term here cannot change
   * speech recognition behaviour.
   */
  titleTerms?: string[];
}

export const SKILL_LEXICON: LexiconEntry[] = [
  {
    normalized: "pottery",
    patterns: [
      "mitti ke bartan", "matka", "kumhar", "pottery", "clay pot", "ghara",
      "मिट्टी के बर्तन", "मटका", "कुम्हार", "chak", "potter",
      "terracotta", "earthen pot", "diya banana", "kulhad", "bartan banata",
      "মাটির হাঁড়ি", "মাটির বাসন", "কুমোর", "பானை", "மண் பானை", "குயவர்",
      "మట్టి కుండ", "కుమ్మరి", "मातीची भांडी", "कुंभार", "ಮಣ್ಣಿನ ಪಾತ್ರೆ",
      "ಕುಂಬಾರ", "માટીના વાસણ", "કુંભાર", "ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ", "ਘੁਮਿਆਰ",
      "ମାଟି ପାତ୍ର", "କୁମ୍ଭାର",
    ],
    titleTerms: ["potter", "terracotta", "ceramic"],
  },
  {
    normalized: "tailoring",
    patterns: [
      "silai", "silaai", "kapda silna", "darzi", "tailor", "stitching",
      "sewing", "सिलाई", "दर्जी", "blouse", "kurta silna",
      "stiching", "stitch", "kapde silna", "kapde silti", "kapde silta", "kapde banana", "dress making",
      "alteration", "embroidery machine", "सिलाई मशीन", "कपड़े सिलना",
      "সেলাই", "দর্জি", "தையல்", "தையல்காரர்", "కుట్టు", "దర్జీ",
      "शिलाई", "शिंपी", "ಹೊಲಿಗೆ", "ಟೈಲರ್", "સિલાઈ", "દરજી",
      "ਸਿਲਾਈ", "ਦਰਜ਼ੀ", "ସିଲାଇ", "ଦରଜି",
      "سلائی", "درزی", "میں سلائی کرتی", "میں سلائی کرتا", "سلائی کرتی", "سلائی کرتا",
    ],
    titleTerms: ["tailor", "darzi", "sewing"],
  },
  {
    normalized: "cotton-spinning",
    patterns: [
      "kapas", "rui", "cotton", "charkha", "sut katna", "dhaaga banana",
      "dhaga banana", "ginning", "spinning", "cotton mill", "kapas se dhaaga",
      "कपास", "रुई", "चरखा", "सूत", "धागा बनाना",
      "তুলা", "সুতা", "பருத்தி", "நூல்", "పత్తి", "నూలు",
      "कापूस", "सूत कातणे", "ಹತ್ತಿ", "ನೂಲು", "કપાસ", "સૂતર",
      "ਕਪਾਹ", "ਸੂਤ", "କପା", "ସୂତା",
    ],
    titleTerms: ["spinning", "hand spinning", "ginning", "yarn", "cotton"],
  },
  {
    normalized: "handloom-weaving",
    patterns: [
      "bunkar", "kapda bunna", "handloom", "weaving", "julaha", "loom", "bunai", "bunaai",
      "बुनकर", "बुनाई", "saree bunna", "chadar bunna",
      "weaver", "cloth weaving", "তাঁত", "তাঁতি", "நெசவு", "கைத்தறி",
      "నేయడం", "చేనేత", "विणकाम", "हातमाग", "ನೇಯ್ಗೆ", "ಕೈಮಗ್ಗ",
      "વણાટ", "હાથવણાટ", "ਬੁਣਾਈ", "ਹੱਥਕੱਤਾ", "ବୁଣା", "ହସ୍ତତନ୍ତ",
    ],
    titleTerms: ["loom", "weaver", "weaving"],
  },
  {
    normalized: "leatherwork",
    patterns: [
      "chamda", "chamar", "jooti banana", "leather", "cobbler", "mochi",
      "चमड़ा", "मोची", "shoe making", "footwear",
      "chappal banana", "shoe repair", "জুতো", "চামড়া", "தோல் வேலை",
      "செருப்பு", "తోలు పని", "చెప్పులు", "चामडे", "चप्पल", "ಚರ್ಮ ಕೆಲಸ",
      "ಚಪ್ಪಲಿ", "ચામડું", "ચંપલ", "ਚਮੜਾ", "ਜੁੱਤੀ", "ଚମଡ଼ା", "ଜୋତା",
    ],
    titleTerms: ["leather", "footwear", "cobbler"],
  },
  {
    normalized: "carpentry",
    patterns: [
      "badhai", "lakdi ka kaam", "carpenter", "furniture banana", "wood work",
      "बढ़ई", "लकड़ी", "carpentry",
      "woodwork", "furniture repair", "काठ", "সুতোার", "কাঠের কাজ",
      "தச்சு", "மர வேலை", "వడ్రంగి", "చెక్క పని", "सुतार", "लाकडी काम",
      "ಬಡಗಿ", "ಮರದ ಕೆಲಸ", "સુથાર", "લાકડાનું કામ", "ਤਰਖਾਣ", "ਲੱਕੜ ਦਾ ਕੰਮ",
      "ବଢ଼େଇ", "କାଠ କାମ",
    ],
    titleTerms: ["carpenter", "wood work"],
  },
  {
    normalized: "masonry",
    patterns: [
      // "mistri" alone is any craftsman ("AC ka mistri" is a technician), so
      // only the qualified forms count as masonry
      "raj mistri", "diwar banana", "mason", "masonry", "construction",
      "राज मिस्त्री", "brick", "plaster",
      "brickwork", "cement ka kaam", "building work", "दीवार", "प्लास्टर",
      "রাজমিস্ত্রি", "ইটের কাজ", "கட்டிட வேலை", "மேஸ்திரி", "తాపీ మేస్త్రీ",
      "ఇటుక పని", "गवंडी", "बांधकाम", "ಮೇಸ್ತ್ರಿ", "ಕಟ್ಟಡ ಕೆಲಸ",
      "કડિયો", "બાંધકામ", "ਰਾਜ ਮਿਸਤਰੀ", "ਇੱਟਾਂ ਦਾ ਕੰਮ", "ରାଜମିସ୍ତ୍ରୀ", "ଇଟା କାମ",
    ],
    titleTerms: ["mason", "bricklayer"],
  },
  {
    normalized: "agriculture",
    patterns: [
      "kheti", "kisan", "farming", "fasal", "khet", "agriculture", "farmer",
      "खेती", "किसान", "फसल", "crop",
      "खेती बाड़ी", "জমি চাষ", "কৃষক", "விவசாயம்", "விவசாயி",
      "వ్యవసాయం", "రైతు", "शेती", "शेतकरी", "ಕೃಷಿ", "ರೈತ",
      "ખેતી", "ખેડૂત", "ਖੇਤੀ", "ਕਿਸਾਨ", "ଚାଷ", "ଚାଷୀ",
    ],
  },
  {
    normalized: "dairy-livestock",
    patterns: [
      "pashu palan", "gaay bhains", "doodh", "dairy", "cattle", "livestock",
      "पशुपालन", "दूध", "goat", "bakri palan",
      "milk selling", "buffalo", "cow", "গরু", "দুধ", "மாடு", "பால்",
      "పాలు", "ఆవు", "दूध विकतो", "गाय म्हैस", "ಹಾಲು", "ಹಸು",
      "દૂધ", "ગાય ભેંસ", "ਦੁੱਧ", "ਗਾਂ ਮੱਝ", "ଦୁଧ", "ଗାଈ",
    ],
  },
  {
    normalized: "beautician",
    patterns: [
      "parlour", "beauty parlour", "mehndi", "beautician", "salon",
      "पार्लर", "मेहंदी",
      "makeup", "facial", "hair cutting", "বিউটি পার্লার", "মেহেদি",
      "அழகு நிலையம்", "மெஹந்தி", "బ్యూటీ పార్లర్", "మెహందీ", "ब्यूटी पार्लर",
      "मेंदी", "ಬ್ಯೂಟಿ ಪಾರ್ಲರ್", "ಮೆಹಂದಿ", "બ્યુટી પાર્લર", "મેહંદી",
      "ਬਿਊਟੀ ਪਾਰਲਰ", "ਮੇਹੰਦੀ", "ବ୍ୟୁଟି ପାର୍ଲର", "ମେହେନ୍ଦି",
    ],
  },
  {
    normalized: "food-processing",
    patterns: [
      "achaar", "papad", "pickle", "food banana",
      "अचार", "पापड़", "catering", "halwai", "sweets", "namkeen",
      "khana banana", "cooking", "snacks", "আচার", "পাঁপড়", "রান্না",
      "ஊறுகாய்", "அப்பளம்", "சமையல்", "ఆవకాయ", "పప్పడం", "వంట",
      "लोणचे", "पापड", "स्वयंपाक", "ಉಪ್ಪಿನಕಾಯಿ", "ಹಪ್ಪಳ", "ಅಡುಗೆ",
      "અથાણું", "પાપડ", "રસોઈ", "ਅਚਾਰ", "ਪਾਪੜ", "ਰਸੋਈ",
      "ଆଚାର", "ପାପଡ଼", "ରୋଷେଇ",
    ],
  },
  {
    normalized: "electrical",
    patterns: [
      "bijli ka kaam", "electrician", "wiring", "bijli mistri", "electrical",
      "बिजली", "इलेक्ट्रीशियन", "motor repair",
      "wire fitting", "house wiring", "electric repair", "বিদ্যুৎ", "ইলেকট্রিশিয়ান",
      "மின்சாரம்", "எலக்ட்ரீஷியன்", "విద్యుత్", "ఎలక్ట్రీషియన్",
      "वीज", "इलेक्ट्रिशियन", "ವಿದ್ಯುತ್", "ಎಲೆಕ್ಟ್ರಿಷಿಯನ್",
      "વીજળી", "ઇલેક્ટ્રિશિયન", "ਬਿਜਲੀ", "ਇਲੈਕਟ੍ਰੀਸ਼ਨ", "ବିଦ୍ୟୁତ", "ଇଲେକ୍ଟ୍ରିସିଆନ",
    ],
  },
  {
    normalized: "plumbing",
    patterns: [
      "plumber", "nal ka kaam", "paip", "pipe fitting", "plumbing",
      "प्लंबर", "नल",
      "water pipe", "tap fitting", "প্লাম্বার", "পাইপ", "பிளம்பர்", "குழாய்",
      "ప్లంబర్", "పైపు", "नळ", "प्लंबिंग", "ಪ್ಲಂಬರ್", "ಪೈಪ್",
      "પ્લમ્બર", "પાઈપ", "ਪਲੰਬਰ", "ਪਾਈਪ", "ପ୍ଲମ୍ବର", "ପାଇପ",
    ],
    titleTerms: ["plumber"],
  },
  {
    normalized: "welding",
    patterns: [
      "welding", "welder", "loha jodna", "gate banana",
      "वेल्डिंग", "grill banana",
      "iron welding", "metal joining", "ওয়েল্ডিং", "வெல்டிங்", "వెల్డింగ్",
      "वेल्डर", "ವೆಲ್ಡಿಂಗ್", "વેલ્ડિંગ", "ਵੈਲਡਿੰਗ", "ୱେଲ୍ଡିଂ",
    ],
    titleTerms: ["welder", "welding"],
  },
  {
    normalized: "mobile-repair",
    patterns: [
      "mobile repair", "phone thik karna", "mobile theek", "handset repair",
      "मोबाइल रिपेयर",
      "phone repair", "screen change", "মোবাইল মেরামত", "போன் ரிப்பேர்",
      "మొబైల్ రిపేర్", "मोबाईल दुरुस्ती", "ಮೊಬೈಲ್ ರಿಪೇರಿ",
      "મોબાઇલ રિપેર", "ਮੋਬਾਈਲ ਰਿਪੇਅਰ", "ମୋବାଇଲ ରିପେୟାର",
    ],
    titleTerms: ["handheld device", "mobile & accessor", "handheld device", "mobile & accessor", "handset"],
  },
  {
    normalized: "driving",
    patterns: [
      "driver", "gaadi chalana", "driving", "auto chalana", "taxi",
      "ड्राइवर", "गाड़ी चलाना",
      "vehicle driving", "গাড়ি চালানো", "ড্রাইভার", "வண்டி ஓட்டுதல்",
      "டிரைவர்", "డ్రైవింగ్", "డ్రైవర్", "गाडी चालवणे", "ಡ್ರೈವಿಂಗ್",
      "ಚಾಲಕ", "ડ્રાઇવિંગ", "ડ્રાઇવર", "ਡਰਾਈਵਿੰਗ", "ਡਰਾਈਵਰ",
      "ଗାଡ଼ି ଚଲାଇବା", "ଡ୍ରାଇଭର",
    ],
  },
  {
    normalized: "handicraft-bamboo",
    patterns: [
      "baans", "bamboo", "tokri banana", "basket", "cane", "handicraft",
      "बांस", "टोकरी", "jute craft",
      "basket weaving", "বাঁশ", "ঝুড়ি", "மூங்கில்", "கூடை", "వెదురు",
      "బుట్ట", "बांबू", "टोपली", "ಬಿದಿರು", "ಬುಟ್ಟಿ", "વાંસ", "ટોપલી",
      "ਬਾਂਸ", "ਟੋਕਰੀ", "ବାଂଶ", "ଟୋକେଇ",
    ],
    titleTerms: ["basket maker", "bamboo", "cane"],
  },
  {
    normalized: "embroidery",
    patterns: [
      "kadhai", "embroidery", "zari", "zardozi", "kaam wala kapda",
      "कढ़ाई", "जरी",
      "hand embroidery", "সুচিকর্ম", "জরি", "எம்பிராய்டரி", "జరీ",
      "ఎంబ్రాయిడరీ", "भरतकाम", "ಜರಿ", "ಕಸೂತಿ", "ભરતકામ", "જરી",
      "ਕਢਾਈ", "ਜ਼ਰੀ", "ଏମ୍ବ୍ରୋଇଡରି", "ଜରି",
    ],
    titleTerms: ["embroider"],
  },
  {
    normalized: "housekeeping",
    patterns: [
      "safai", "ghar ka kaam", "housekeeping", "cleaning", "domestic work",
      "सफाई", "jhadu pocha",
      "house cleaning", "घर की सफाई", "পরিষ্কার", "বাড়ির কাজ", "சுத்தம்",
      "வீட்டு வேலை", "శుభ్రం", "ఇంటి పని", "घरकाम", "स्वच्छता",
      "ಸ್ವಚ್ಛತೆ", "ಮನೆ ಕೆಲಸ", "સફાઈ", "ઘરકામ", "ਸਫਾਈ", "ਘਰ ਦਾ ਕੰਮ",
      "ସଫା", "ଘର କାମ",
    ],
  },
  {
    normalized: "healthcare-support",
    patterns: [
      "asha", "anganwadi", "nurse", "patient care", "dai", "midwife",
      "आशा", "आंगनवाड़ी", "ward boy", "home nursing",
    ],
  },
  {
    normalized: "medical-care",
    patterns: [
      "doctor", "medical doctor", "clinic", "clinical work", "medical practice",
      "patient treatment", "treat patients", "healthcare worker", "health worker",
      "hospital work", "दवाखाना", "डॉक्टर", "चिकित्सक", "मरीजों का इलाज",
      "अस्पताल में काम",
    ],
    titleTerms: [
      "frontline health caregiving", "general duty assistant", "foundation course in healthcare",
      "emergency medical technician", "medical", "healthcare",
    ],
  },
  {
    normalized: "retail",
    patterns: [
      "dukan", "shop", "kirana", "retail", "sales", "billing",
      "दुकान", "किराना", "salesman",
      "store work", "দোকান", "বিক্রি", "கடை", "விற்பனை", "దుకాణం",
      "అమ్మకం", "दुकान", "विक्री", "ಅಂಗಡಿ", "ಮಾರಾಟ", "દુકાન",
      "વેચાણ", "ਦੁਕਾਨ", "ਵਿਕਰੀ", "ଦୋକାନ", "ବିକ୍ରି",
    ],
  },

  // ── Agriculture (expanded) ─────────────────────────────────────────────
  {
    normalized: "poultry",
    patterns: [
      "murgi", "chicken", "hen", "poultry", "kukkut", "anda", "egg farm", "broiler", "bird for egg","murgi palan", "poultry farm", "chicken farm", "अंडे का व्यापार", "मुर्गी पालन", "poultry"],
  },
  {
    normalized: "horticulture",
    patterns: [
      "bagwani", "horticulture", "phal sabzi", "fruits and vegetables", "nursery", "orchard", "podhe lagata", "sabzi ki kheti", "saplings","bagwani", "phal ki kheti", "sabzi ki kheti", "nursery", "बागवानी", "horticulture", "nursery ka kaam"],
  },
  {
    normalized: "fisheries",
    patterns: [
      "machhli", "fish", "matsya", "fisherman", "talab mein machhli", "fish farm", "boat catching","machli palan", "matsya palan", "fish farming", "मछली पालन", "fisheries"],
  },
  {
    normalized: "beekeeping",
    patterns: [
      "madhumakhi", "bee", "honey", "shahad", "apiary", "madhu makkhi", "bee farm", "मधुमक्खी",
      "honey banana", "shahad banana","madhumakhi palan", "shahad", "honey farming", "मधुमक्खी पालन", "beekeeping"],
    titleTerms: ["honey bee", "apiculture", "beekeeper"],
  },
  {
    normalized: "sericulture",
    patterns: [
      "resham", "silk", "sericulture", "silkworm", "silk worm", "cocoon", "mulberry", "keede palta","resham keet palan", "silk farming", "sericulture", "रेशम पालन", "रेशम कीट"],
    titleTerms: ["silkworm", "silk reeling", "cocoon"],
  },

  // ── Handicrafts (expanded) ──────────────────────────────────────────────
  {
    normalized: "wood-carving",
    patterns: [
      "lakdi par nakkashi", "wood carv", "lakdi ki carving", "wooden art", "carved wooden", "kaath par design", "nakkashi lakdi", "carving on timber","lakdi ki nakkashi", "wood carving", "काष्ठ नक्काशी", "लकड़ी की नक्काशी", "murti lakdi"],
    titleTerms: ["wood carv", "wooden toy", "artisan wood"],
  },
  {
    normalized: "stone-carving",
    patterns: [
      "marble carving", "stone sculpt",
      "carve stone", "stone statue", "patthar par nakkashi", "sculptor", "shilpkar", "patthar tarash", "murti banana","patthar ki nakkashi", "stone carving", "पत्थर की नक्काशी", "murti patthar", "sangtarashi"],
    titleTerms: ["stone carv", "sculpt", "stone artisan"],
  },
  {
    normalized: "metal-craft",
    patterns: [
      "metal handicraft", "metalwork", "dhatu se murti",
      "dhatu ka kaam", "dhatu shilp", "metal work", "peetal ka saman", "brass work","pital ka kaam", "dhatu shilp", "brass work", "bell metal", "पीतल का काम", "धातु शिल्प"],
    titleTerms: ["metalware", "planishing", "acid cleaner", "metal craft", "brass", "artware", "metal artisan"],
  },
  {
    normalized: "carpet-weaving",
    patterns: [
      "carpet weav", "woollen carpet", "kaleen ka kaam",
      "kaleen bunta", "kaleen bun", "dari banana", "rug making", "galicha", "carpet knot","kaleen bunai", "carpet weaving", "galeecha", "कालीन बुनाई", "गलीचा"],
    titleTerms: ["carpet", "durrie", "rug weav"],
  },
  {
    normalized: "jewellery-making",
    patterns: [
      "jewellery", "jewelry", "gold ornament", "silver jewel", "chandi ke gehne",
      "gehne banata", "gehne bana", "zewar bana", "ornament making", "goldsmith", "गहने बनाना", "sunar","jewellery banana", "sunar", "gehna banana", "jewellery making", "जौहरी", "सुनार", "गहना बनाना"],
    titleTerms: ["goldsmith", "jewell", "sunar"],
  },
  {
    normalized: "pattern-making",
    patterns: [
      "pattern mak", "pattern bana", "cutting master", "garment pattern", "design cutting", "sample maker", "draft design",
      "पैटर्न बनाना", "pattern banana", "cutting master", "garment pattern","pattern banana", "cutting master", "pattern making", "कटिंग मास्टर"],
    titleTerms: ["pattern master", "pattern maker"],
  },
  {
    normalized: "garment-quality-check",
    patterns: [
      "kapde ki checking", "quality check", "garment quality", "inline checker", "kapda inspection", "checking karta", "garment defect", "finished garment","quality check kapde", "garment checking", "गारमेंट चेकिंग", "क्वालिटी चेकर"],
    titleTerms: ["sample maker", "inline checker"],
  },
  {
    normalized: "fabric-dyeing",
    patterns: [
      "dye cloth", "dyeing", "rangai", "rangayi", "kapde rang","rangai", "kapda rangna", "dyeing", "रंगाई", "कपड़ा रंगना"],
  },
  {
    normalized: "leather-goods",
    patterns: [
      "chamde ka bag", "leather goods", "leather bag", "leather belt", "chamda ka saman", "leather accessor", "purse banata", "wallet bana", "leather product","chamde ka samaan", "bag banana chamda", "leather bag", "leather goods", "चमड़े का सामान"],
    titleTerms: ["leather goods", "leather accessor", "sample maker"],
  },
  {
    normalized: "furniture-polishing",
    patterns: [
      "french polish", "polish ka kaam", "furniture polish", "wood finishing", "lakdi polish","furniture polish", "polish karna", "फर्नीचर पॉलिश", "पॉलिश का काम"],
    titleTerms: ["polish", "rubberwood"],
  },

  // ── Construction (expanded) ─────────────────────────────────────────────
  {
    normalized: "bar-bending",
    patterns: [
      "sariya mod", "sariya ka kaam", "bar bend", "rebar", "steel fixer", "loha modne","sariya modna", "bar bending", "सरिया मोड़ना", "सरिया बेंडर"],
    titleTerms: ["bar bender", "steel fixer", "rebar"],
  },
  {
    normalized: "tile-laying",
    patterns: [
      "floor tile", "tiles ka kaam", "tile lagana", "tile fit", "tiling", "farsh ki tile","tile lagana", "tiles fitting", "टाइल लगाना", "टाइल फिटिंग"],
    titleTerms: ["tile mason", "tile fixer"],
  },
  {
    normalized: "house-painting",
    patterns: [
      "ghar mein paint", "putai", "house paint", "wall paint", "deewar par paint", "painter", "rang rogan", "building painting","painting ka kaam", "rang rogan", "painter", "पेंटिंग", "रंग रोगन", "भवन पेंटर"],
    titleTerms: ["painter", "painting"],
  },
  {
    normalized: "scaffolding",
    patterns: [
      "scaffolding", "temporary structure", "pipe scaffold", "tower scaffold",
      "balli baandh", "scaffolder", "scaffold", "dhancha bandhna","scaffolding", "बांस बल्ली", "स्कैफोल्डिंग"],
    titleTerms: ["scaffold"],
  },

  // ── Beauty & Wellness (expanded) ────────────────────────────────────────
  {
    normalized: "hair-styling",
    patterns: [
      "baal katta", "baal kat", "bal katta", "bal kat", "bal kaatna", "hair cut", "haircut", "hairdress", "naai", "hajaam", "salon mein baal","hair cutting", "hair style", "hair dresser", "naai", "barber", "बाल काटना", "हेयर स्टाइलिस्ट", "नाई"],
  },
  {
    normalized: "makeup-artist",
    patterns: ["makeup", "makeup artist", "मेकअप", "मेकअप आर्टिस्ट"],
  },
  {
    normalized: "spa-therapy",
    patterns: [
      "wellness centre", "spa therapist", "ayurvedic massage",
      "malish", "maalish", "massage", "spa", "body massage", "tel malish","spa", "massage therapy", "स्पा", "मसाज थेरेपी"],
    titleTerms: ["beauty therapist", "spa", "therapy assistant"],
  },

  // ── Food (expanded) ──────────────────────────────────────────────────────
  {
    normalized: "bakery",
    patterns: [
      "baker", "pav bana", "pastry",
      "biscuit", "bun banana", "double roti", "bread bana", "cake bana", "bakery","bakery", "cake banana", "bread banana", "बेकरी", "केक बनाना", "ब्रेड बनाना"],
  },
  {
    normalized: "dairy-processing",
    patterns: [
      "paneer bana", "doodh se", "dairy process", "ghee", "butter", "milk process", "doodh ka karkhana", "dahi bana", "doodh ki packing","paneer banana", "ghee banana", "doodh processing", "पनीर बनाना", "घी बनाना"],
    titleTerms: ["dairy", "milk product"],
  },
  {
    normalized: "domestic-cooking",
    patterns: [
      "घरेलू रसोई", "ghar ka khana bana", "ghar mein khana bana", "house cook", "domestic cook","ghar ka khana", "khana banana", "cooking", "रसोइया", "khana banane ka kaam", "घर का खाना"],
  },
  {
    normalized: "cooking-chef",
    patterns: [
      "rasoiya", "halwai", "chef", "restaurant cook", "hotel mein khana","chef", "hotel mein khana", "rasoiya hotel", "khana banana", "cooking", "शेफ", "बावर्ची"],
  },

  // ── Electronics & Power (expanded) ──────────────────────────────────────
  {
    normalized: "ac-repair",
    patterns: [
      "ac ka mistri", "ac mistri",
      "ac theek", "ac repair", "ac ka kaam", "split ac", "ac servic", "air conditioner", "ac gas", "refrigeration",
      "ac repair", "ac mechanic", "air conditioner", "air conditioning",
      "conditioner repair", "cooling machine", "एसी रिपेयर", "एसी मैकेनिक",
    ],
    titleTerms: ["air conditioner", "air condition", "hvac", "refrigerat"],
  },
  {
    normalized: "electronics-repair",
    patterns: [
      "electronics", "appliance repair", "circuit board", "tv fridge",
      "tv theek", "tv repair", "television", "electronics repair", "electronic saman", "fridge repair", "washing machine repair","tv repair", "fridge repair", "electronics repair", "टीवी रिपेयर", "फ्रिज रिपेयर"],
  },
  {
    normalized: "solar-installation",
    patterns: [
      "solar", "rooftop solar", "photovoltaic", "solar plate","solar panel", "surya urja", "solar installation", "सोलर पैनल", "सौर ऊर्जा"],
  },
  {
    normalized: "lineman",
    patterns: [
      "bijli ki line", "lineman", "line man", "electric pole", "power line", "bijli ka khamba", "tar jodne", "distribution line","lineman", "bijli ka khambha", "electric pole", "लाइनमैन"],
  },
  {
    normalized: "house-wiring",
    patterns: [
      "ghar ki wiring", "house wiring", "wiring ka kaam", "domestic wiring", "switch board", "internal wiring", "makan mein bijli", "fit switches","wiring ka kaam", "ghar ki wiring", "wireman", "वायरिंग", "वायरमैन"],
  },

  // ── Capital Goods (expanded) ─────────────────────────────────────────────
  {
    normalized: "fitter",
    patterns: [
      "fitter", "fitting ka kaam", "machine assemble", "mechanical fitting", "parts jodne", "machine fitter","fitter ka kaam", "machine fitting", "फिटर"],
    titleTerms: ["fitter"],
  },
  {
    normalized: "fabrication",
    patterns: [
      "fabrication", "fabricat", "steel structure", "gate grill", "sheet metal", "loha jodne", "structure banane","fabrication", "sheet metal ka kaam", "फैब्रिकेशन", "शीट मेटल"],
  },

  // ── Automotive (expanded) ────────────────────────────────────────────────
  {
    normalized: "two-wheeler-repair",
    patterns: [
      "two wheeler", "bike theek", "bike repair", "bike mechanic", "scooter", "scooty", "motorcycle","bike repair", "scooter mechanic", "do pahiya vahan", "बाइक रिपेयर", "दोपहिया मैकेनिक"],
  },
  {
    normalized: "car-repair",
    patterns: [
      "gaadi theek", "gaadi ki marammat", "car garage", "car repair", "car mechanic", "motor mechanic", "four wheeler","car mechanic", "gaadi ka mechanic", "car repair", "कार मैकेनिक"],
    titleTerms: ["automotive", "automobile", "vehicle technician"],
  },
  {
    normalized: "car-wash",
    patterns: [
      "gaadi dhota", "gaadi dho", "car wash", "gaadi ki safai", "कार धुलाई", "vehicle wash","car washing", "gaadi dhona", "car wash", "गाड़ी धोना"],
    titleTerms: ["washerman", "dhobi", "washing"],
  },

  // ── Domestic Work (expanded) ─────────────────────────────────────────────
  {
    normalized: "childcare",
    patterns: [
      "look after children", "nanny", "chhote bachche",
      "bachchon ki dekhbhal", "bachche sambhal", "childcare", "child care", "creche", "baby sitting", "aaya ka kaam", "anganwadi","bachon ki dekhbhal", "nanny", "babysitting", "बच्चों की देखभाल"],
    titleTerms: ["creche", "anganwadi", "child care"],
  },
  {
    normalized: "elderly-care",
    patterns: [
      "old people", "senior", "attendant for elderly", "bimar budhe",
      "budhon ki seva", "buzurg ki dekhbhal", "elderly care", "old age", "caregiver", "budhe ki seva","budhon ki dekhbhal", "elderly care", "बुजुर्गों की देखभाल"],
  },

  // ── Healthcare (expanded) ────────────────────────────────────────────────
  {
    normalized: "pharmacy-assistant",
    patterns: [
      "medicine counter", "dawa dene", "pharmacist", "medicines at a chemist", "sell medicine",
      "फार्मेसी", "pharmacy", "medical store", "dawai ki dukan", "chemist","medical store", "pharmacy", "dawai dukan", "मेडिकल स्टोर", "दवाई की दुकान"],
  },
  {
    normalized: "phlebotomy",
    patterns: [
      "blood sample", "khoon ki jaanch", "nas se khoon", "blood draw",
      "फ्लेबोटॉमी", "phlebotom", "blood collection", "khoon nikal","khoon nikalna", "blood sample", "phlebotomy", "लैब सैंपल", "खून निकालना"],
    titleTerms: ["phlebotom"],
  },

  // ── Retail / IT-ITeS / BFSI ──────────────────────────────────────────────
  {
    normalized: "ecommerce-logistics",
    patterns: [
      "online order", "parcel pack", "ecommerce", "e-commerce", "courier sort", "order fulfil", "packing ka kaam", "godown packing", "online saman","ecommerce packing", "online order packing", "amazon flipkart kaam", "ई-कॉमर्स पैकिंग"],
    titleTerms: ["e-commerce", "logistics associate"],
  },
  {
    normalized: "computer-operator",
    patterns: [
      "computer chalata", "ms office", "typing",
      "dtp operator", "data entry", "computer operator", "computer par typing", "data feeding","computer chalana", "data entry", "computer operator", "कंप्यूटर ऑपरेटर", "डेटा एंट्री"],
  },
  {
    normalized: "clerk-office-assistant",
    patterns: [
      "clerk", "office clerk", "office assistant", "clerical work", "office work",
      "file work", "record keeping", "documents manage", "dak clerk", "admin assistant",
      "क्लर्क", "ऑफिस असिस्टेंट", "दफ्तर का काम", "फाइल का काम", "रिकॉर्ड रखना",
    ],
    titleTerms: ["office assistant", "clerk", "clerical", "record keeping", "office administration"],
  },
  {
    normalized: "customer-support",
    patterns: [
      "customer support", "customer care", "call center", "call centre", "telecaller", "helpline", "bpo","call center", "customer care", "bpo", "कॉल सेंटर", "ग्राहक सेवा"],
  },
  {
    normalized: "banking-correspondent",
    patterns: [
      "bank mein", "villagers with bank", "bank account",
      "bank work", "bank ka kaam", "paise nikalne", "aadhaar se paisa",
      "bc point", "bank mitra", "banking correspondent", "business correspondent", "csp operator","bank correspondent", "banking sakhi", "बैंक सखी", "बिजनेस कॉरेस्पॉन्डेंट"],
    titleTerms: ["banking", "business correspondent"],
  },
  {
    normalized: "insurance-agent",
    patterns: [
      "insurance", "bima", "policy bech", "lic agent","insurance agent", "bima agent", "बीमा एजेंट"],
  },
  {
    normalized: "accounting",
    patterns: [
      "hisab kitab", "munshi", "khata bahi", "accounting", "bookkeeping", "accountant", "tally",
      "accounting", "accounts", "accountant", "book keeping", "bookkeeping",
      "tally", "gst filing", "billing accounts", "लेखा", "अकाउंटिंग", "अकाउंटेंट",
    ],
    titleTerms: ["account", "tally", "book keeping"],
  },

  // ── Tourism & Hospitality ─────────────────────────────────────────────────
  {
    normalized: "waiter-steward",
    patterns: [
      "hotel mein waiter", "banquet", "catering staff", "restaurant mein order",
      "table service", "khana paros", "waiter", "steward", "order lena restaurant","waiter", "steward", "hotel mein serving", "वेटर"],
  },
  {
    normalized: "hotel-housekeeping",
    patterns: [
      "hotel ki safai", "hotel room", "make beds", "room attendant", "housekeeping staff", "kamre ki safai","hotel housekeeping", "hotel safai", "होटल हाउसकीपिंग"],
    titleTerms: ["housekeeper", "housekeeping"],
  },
  {
    normalized: "tour-guide",
    patterns: [
      "tourist guide", "guide ka kaam", "tourism guide",
      "ghumata", "visitors", "smarak dikha",
      "tourist", "tour guide", "sightseeing", "paryatak", "monument", "travel guide","tour guide", "paryatak guide", "गाइड", "पर्यटक गाइड"],
  },

  // ── Logistics / Security ──────────────────────────────────────────────────
  {
    normalized: "warehouse-operations",
    patterns: [
      "load and store", "maal ka rakhrakhav", "warehouse helper",
      "godown mein kaam", "godown ka kaam", "warehouse", "stock keeper", "inventory","warehouse ka kaam", "godam", "packing warehouse", "गोदाम", "वेयरहाउस"],
    titleTerms: ["warehouse"],
  },
  {
    normalized: "delivery-executive",
    patterns: [
      "ghar ghar saman", "last mile", "swiggy", "zomato",
      "saman deliver", "deliver parcel", "delivery boy", "delivery executive", "courier deliver", "food delivery","delivery boy", "delivery ka kaam", "parcel delivery", "डिलीवरी", "स्विगी ज़ोमैटो"],
    titleTerms: ["last mile", "delivery"],
  },
  {
    normalized: "forklift-operator",
    patterns: [
      "forklift", "material handling", "stacker", "pallet","forklift", "फोर्कलिफ्ट"],
  },
  {
    normalized: "security-guard",
    patterns: [
      "guard a building", "night duty", "gate pe duty","security guard", "chowkidar", "watchman", "गार्ड", "चौकीदार"],
  },

  // ── Telecom / Media / Sports / Others ─────────────────────────────────────
  {
    normalized: "telecom-tower",
    patterns: [
      "mobile tower", "telecom tower", "tower technician", "bts", "antenna", "tower maintenance", "tower pe chadh", "telecom infra","mobile tower", "telecom tower", "टावर तकनीशियन", "मोबाइल टावर"],
  },
  {
    normalized: "fiber-installation",
    patterns: [
      "fiber cable", "fibre cable", "optical fiber", "optical fibre", "broadband cable", "internet cable", "ofc lay", "fibre technician", "fiber lagata","optical fiber", "internet cable", "broadband installation", "फाइबर केबल", "ब्रॉडबैंड"],
  },
  {
    normalized: "photography",
    patterns: [
      "photo khinch", "photograph", "camera ka kaam", "photo shoot", "shaadi ki photo","photography", "photo khichna", "photographer", "फोटोग्राफी", "फोटोग्राफर"],
  },
  {
    normalized: "video-editing",
    patterns: [
      "video edit", "video banane", "film editing", "post production", "footage",
      "video editing", "video edit", "make videos", "making videos", "video banana",
      "video banata", "video banati", "content creator", "वीडियो एडिटिंग", "वीडियो बनाना",
    ],
    titleTerms: ["video editing", "web video", "video blogger", "editor"],
  },
  {
    normalized: "fitness-training",
    patterns: [
      "fitness", "gym", "yoga", "personal trainer", "exercise karv", "gym instructor", "fitness coach","gym trainer", "fitness trainer", "yoga instructor", "जिम ट्रेनर", "योगा ट्रेनर"],
  },
  {
    normalized: "rubber-processing",
    patterns: [
      "rubber", "latex", "rubber sheet", "rubber tapping", "tyre factory","rubber tapping", "rubber ka kaam", "रबर टैपिंग"],
    titleTerms: ["rubber"],
  },
  {
    normalized: "mining-helper",
    patterns: [
      "khadan", "khan majdoor", "mine mein kaam", "quarry", "mining","khadan mein kaam", "mining", "खदान"],
  },
  {
    normalized: "lab-technician",
    patterns: [
      "lab mein kaam", "laboratory", "pathology", "medical test", "jaanch karta","lab technician", "prayogshala", "lab assistant", "प्रयोगशाला सहायक"],
  },
  {
    normalized: "teaching",
    patterns: [
      "master ji", "padhata", "padhati", "padhane ka kaam", "tuition", "coaching", "teacher", "shikshak", "school mein padha",
      "teacher", "teaching", "teach", "tutor", "tuition", "school teacher",
      "play school", "children ko padhana", "bachchon ko padhana",
      "adhyapak", "shikshak", "padhata hoon", "padhati hoon", "padhana",
      "टीचर", "शिक्षक", "अध्यापक", "पढ़ाना", "पढ़ाती", "पढ़ाता", "पढ़ाते",
      "बच्चों को पढ़ाना", "बच्चों को पढ़ाती", "बच्चों को पढ़ाता", "बच्चों को पढ़ाते",
      "पढ़ाना", "पढ़ाती", "पढ़ाता", "पढ़ाते", "बच्चों को पढ़ाती", "बच्चों को पढ़ाता",
    ],
    titleTerms: ["school facilitator", "teacher", "tutoring", "tutor"],
  },
];

/** Extract normalized skill tokens from a free-text transcript. */

/** How many of a concept's spoken patterns the transcript matches. Used as a
 *  confidence signal: someone who says "mitti ke bartan" AND "kumhar" has
 *  evidenced pottery more strongly than someone who said one word in passing.
 *  Counts only `patterns` (how people speak), never `titleTerms`. */
export function patternHitCount(transcript: string, normalized: string): number {
  const entry = SKILL_LEXICON.find((e) => e.normalized === normalized);
  if (!entry) return 0;
  const hay = normalizeText(transcript);
  return entry.patterns.filter((p) => patternMatches(hay, normalizeText(p))).length;
}

export function titleTermsForSkill(normalized: string): string[] {
  const entry = SKILL_LEXICON.find((e) => e.normalized === normalized);
  return entry?.titleTerms ?? [];
}

export function extractSkills(transcript: string): string[] {
  const hay = normalizeText(transcript);
  const found = new Set<string>();
  for (const entry of SKILL_LEXICON) {
    if (entry.patterns.some((p) => patternMatches(hay, normalizeText(p)))) {
      found.add(entry.normalized);
    }
  }
  return [...found];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function patternMatches(hay: string, pattern: string): boolean {
  if (!pattern) return false;
  if (hay.includes(pattern)) return true;
  if (pattern.length < 6) return false;

  const patternWords = pattern.split(" ").filter(Boolean);
  if (patternWords.length > 1 && patternWords.every((word) => hay.includes(word))) return true;
  // Hindi/Urdu verbs conjugate by gender and number — a lexicon written as
  // "tokri banana" must still match "tokri banata/banati/banate/banaya hoon".
  // Compare the verb stem instead of the full infinitive.
  if (patternWords.length > 1 && patternWords.every((word) => hay.includes(verbStem(word)))) return true;
  if (!isLatinText(pattern)) return false;

  const hayWords = hay.split(" ").filter((word) => word.length >= 4);
  return hayWords.some((word) => isCloseWord(word, pattern));
}


/** Strips the Hindi/Urdu verb ending from a transliterated word so
 *  "banana"/"banata"/"banati"/"banaye" all reduce to "bana". Only applied to
 *  words long enough that the stem stays meaningful. */
function verbStem(word: string): string {
  if (word.length < 6) return word;
  return word.replace(/(na|ta|ti|te|ya|ye|yi|ne)$/u, "");
}

function isLatinText(value: string): boolean {
  return /^[a-z0-9\s]+$/.test(value);
}

/** Fuzzy match to absorb STT spelling variance ("silai"/"silaai"). Requires
 *  the same first letter: transcription wobbles on vowels and endings, not on
 *  the opening consonant, and without this "weather" matched "leather" — a
 *  beneficiary remarking on the weather was told they work in leather. */
function isCloseWord(word: string, pattern: string): boolean {
  if (Math.abs(word.length - pattern.length) > 2) return false;
  if (word.length < 5 || pattern.length < 5) return false;
  if (word[0] !== pattern[0]) return false;
  return levenshtein(word, pattern) <= (pattern.length > 8 ? 2 : 1);
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[a.length][b.length];
}
