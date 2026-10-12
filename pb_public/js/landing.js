// pb_public/js/landing.js
// BharatYatra PWA — Bilingual (Odia & English) Landing Page State, Micro-Animations & Highway Milestone Tracker

const I18N = {
  odia: {
    nav: {
      circuits: "ତୀର୍ଥ ପ୍ୟାକେଜ୍",
      advantage: "ମାଇକ୍ରୋ-ଇଏମଆଇ ସୁବିଧା",
      calculator: "ସଞ୍ଚୟ କାଲକୁଲେଟର୍",
      highway: "ଯାତ୍ରା ରାଜପଥ",
      pass: "ଟ୍ରାଭେଲ୍ ପାସ୍",
      agentLogin: "ସହାୟକ ପୋର୍ଟାଲ୍",
      checkPassBtn: "ପାସ୍ ଯାଞ୍ଚ କରନ୍ତୁ"
    },
    hero: {
      badge: "ଜୟ ଜଗନ୍ନାଥ • ଆଦିତ୍ୟ ଟୁର୍ ଆଣ୍ଡ ଟ୍ରାଭେଲ୍ସ — ଆମ ଓଡ଼ିଶାର ନିଜସ୍ୱ ତୀର୍ଥଯାତ୍ରା ସେବା",
      titleA: "ଆମ ଓଡ଼ିଶାରୁ",
      titleB: "ଚାରିଧାମ ଯାତ୍ରା",
      punchline: "ପୂରା ଟଙ୍କାର ଚିନ୍ତା ନାହିଁ! ମାତ୍ର ଦୁଇଟି କିସ୍ତି ପରେ ବସ୍ ରେ ବସନ୍ତୁ, ବାକି ଟଙ୍କା ଧାମ ଦର୍ଶନ ସାରି ଘରକୁ ଫେରିବା ପରେ ସହଜରେ ଶୁଝନ୍ତୁ।",
      point1: "କୌଣସି ବ୍ୟାଙ୍କ ଋଣ ବା CIBIL ଚିନ୍ତା ନାହିଁ",
      point2: "୧୦୦% ଖାଣ୍ଟି ସାତ୍ତ୍ୱିକ ଆହାର (ବିନା ପିଆଜ-ରସୁଣ)",
      point3: "ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲାରୁ ପ୍ରିମିୟମ ଡିଲକ୍ସ ବସ୍",
      btnExplore: "ତୀର୍ଥ ପ୍ୟାକେଜ୍ ଦେଖନ୍ତୁ",
      btnVerify: "ମୋ ବୁକିଂ ପାସ୍ ଦେଖିବି",
      stat1Lbl: "ଓଡ଼ିଶାର ତୀର୍ଥଯାତ୍ରୀ ଯାଇସାରିଛନ୍ତି",
      stat2Lbl: "ଭକ୍ତଙ୍କ ଆଶୀର୍ବାଦ ଓ ସନ୍ତୋଷ",
      stat3Lbl: "ଗ୍ରାମ ପଞ୍ଚାୟତରେ ନିଜ ସହାୟକ",
      stat4Lbl: "ଖାଣ୍ଟି ସାତ୍ତ୍ୱିକ ପ୍ରସାଦ ନିଶ୍ଚିତ"
    },
    highway: {
      tag: "ଯାତ୍ରା ରାଜପଥ • ADITYA HIGHWAY",
      title: "ଘରୁ ଧାମ ପର୍ଯ୍ୟନ୍ତ ନିଶ୍ଚିନ୍ତ ଯାତ୍ରା",
      desc: "ଘର ଠାରୁ ପବିତ୍ର ଧାମ ଓ ଫେରି ଘର ପର୍ଯ୍ୟନ୍ତ — ଚାରିଟି ସହଜ ଧାପରେ ଆପଣଙ୍କ ତୀର୍ଥ ସ୍ୱପ୍ନ ପୂରଣ:",
      step1: "ଧାପ ୧",
      step2: "ଧାପ ୨",
      step3: "ଧାପ ୩",
      step4: "ଧାପ ୪",
      p1Name: "ଘରେ ସଂକଳ୍ପ",
      p1Month: "ମାସ ୦୧",
      p2Name: "ବସ୍ ଚଢ଼ିବା",
      p2Month: "ମାସ ୦୨",
      p3Name: "ଧାମ ଦର୍ଶନ",
      p3Month: "ଚାରିଧାମ",
      p4Name: "ଘରକୁ ଫେରିବା",
      p4Month: "ମାସ ୦୩-୧୦",
      m1Desc: "ଘରେ ବସି ନିଜ ସହାୟକ ଭାଇଙ୍କ ଠାରୁ ପାସବୁକ୍ ପାଆନ୍ତୁ। ସିଟ୍ ସଂରକ୍ଷିତ ହେଲା।",
      m2Desc: "କେବଳ ଦ୍ୱିତୀୟ କିସ୍ତି ପରେ ଟିକେଟ୍ ଅନଲକ୍! ଚଢ଼ନ୍ତୁ ପ୍ରିମିୟମ ଡିଲକ୍ସ ବସ୍ ରେ।",
      m3Desc: "କେଦାରନାଥ, କାଶୀ ଓ ଅଯୋଧ୍ୟାରେ ଭିଆଇପି ଦର୍ଶନ ଓ ସାତ୍ତ୍ୱିକ ମହାପ୍ରସାଦ।",
      m4Desc: "ଶାନ୍ତିରେ ଘରକୁ ଫେରି ଫସଲ ଅମଳ ଅନୁସାରେ ଛୋଟ ଛୋଟ କିସ୍ତିରେ ବାକି ଶୁଝନ୍ତୁ।",
      banner: "ପାରାମେଡିକ୍ ଓ ସାତ୍ତ୍ୱିକ ରୋଷେଇ ସହ ପ୍ରିମିୟମ ଡିଲକ୍ସ ବସ୍"
    },
    calculator: {
      tag: "ଗ୍ରାମୀଣ ସଞ୍ଚୟ କାଲକୁଲେଟର୍",
      title: "ଆପଣଙ୍କ ଦୈନିକ ସଞ୍ଚୟର ହିସାବ କରନ୍ତୁ",
      desc: "ସକାଳର ୨ କପ୍ ଚାହା ଖର୍ଚ୍ଚ ସହିତ ତୁଳନା କରନ୍ତୁ। ନିଜ ପସନ୍ଦର ପ୍ୟାକେଜ୍ ଓ ମାସିକ ଅବଧି ବାଛି ଯାତ୍ରା ପ୍ଲାନ୍ କରନ୍ତୁ।",
      choosePkg: "୧. ତୀର୍ଥ ପ୍ୟାକେଜ୍ ବାଛନ୍ତୁ",
      chooseTenure: "୨. କିସ୍ତି ପରିଶୋଧ ଅବଧି",
      statusLbl: "ବସ୍ ଚଢ଼ିବା ଅନୁମତି ସ୍ଥିତି",
      unlockMsg: "ମାତ୍ର ୨ଟି କିସ୍ତି ପରେ ଟିକେଟ୍ ମିଳିଯିବ!",
      estEmiLbl: "ମାସିକ କିସ୍ତି (Estimated EMI)",
      perMonth: "/ ମାସକୁ",
      teaCompare: "ଦୈନିକ ୨ କପ୍ ଚାହା ଠାରୁ ମଧ୍ୟ କମ୍",
      toBoardLbl: "ବସ୍ ରେ ଚଢ଼ିବା ପାଇଁ ଆବଶ୍ୟକ:",
      postTravelLbl: "ଯାତ୍ରା ପରେ ବାକି ଟଙ୍କା:",
      channelLbl: "ଟଙ୍କା ସଂଗ୍ରହ ମାଧ୍ୟମ:",
      channelVal: "ନିଜ ଗାଁ ସହାୟକ ଭାଇଙ୍କ ଘରୋଇ ରସିଦ୍",
      bookBtn: "ଘରେ ବସି ବୁକିଂ ଅନୁରୋଧ କରନ୍ତୁ",
      months: "ମାସ"
    },
    testimonials: {
      tag: "ଭକ୍ତମାନଙ୍କ କଥା",
      title: "ଓଡ଼ିଶାର ପରିବାରଙ୍କ ବିଶ୍ୱାସ",
      desc: "ପ୍ରକୃତ ତୀର୍ଥଯାତ୍ରୀ, ପ୍ରକୃତ ଗାଁ — ଆମ ସହ ଯାତ୍ରା କରିଥିବା ପରିବାରଙ୍କ ଶବ୍ଦ।",
      q1: "ବାପା-ମା କେବେ ଓଡ଼ିଶା ଛାଡ଼ିନଥିଲେ। ମାତ୍ର ଦୁଇ କିସ୍ତି ପରେ ଡିଲକ୍ସ ବସ୍ ରେ ବସି ଆମେ ମିଳି କେଦାରନାଥ ଦର୍ଶନ କଲୁ — ବିନା ଋଣ, ବିନା ଚିନ୍ତା।",
      n1: "ସୁନୀତା ବେହେରା",
      p1: "କେନ୍ଦ୍ରାପଡ଼ା • ଚାରିଧାମ ଯାତ୍ରା",
      q2: "ସହାୟକ ଭାଇ ଘରକୁ ଆସି ପାସବୁକ୍ ଓ ରସିଦ୍ ଦେଲେ। ବ୍ୟାଙ୍କ କିମ୍ବା ମୋବାଇଲ୍ ଛୁଇଁବା ଦରକାର ପଡ଼ିଲା ନାହିଁ।",
      n2: "ପ୍ରକାଶ ନାୟକ",
      p2: "ସମ୍ବଲପୁର • ଅଯୋଧ୍ୟା-କାଶୀ ଦର୍ଶନ",
      q3: "ଖାଣ୍ଟି ସାତ୍ତ୍ୱିକ ଖାନା, ଭିଆଇପି ଦର୍ଶନ, ଆଉ ପୁରା ରାସ୍ତା ବାପା-ମା ଆରାମରେ ଥିଲେ। ଏଜେନ୍ସି ନୁହେଁ, ପରିବାର ସହ ଯାତ୍ରା ଭଳି ଲାଗିଲା।",
      n3: "ମାମନୀ ଡିଗାଲ",
      p3: "କଳାହାଣ୍ଡି • ରାମେଶ୍ୱରମ୍ ସର୍କିଟ"
    },
    cta: {
      tag: "ଆଜି ଠାରୁ ଯାତ୍ରା",
      title: "ଆପଣଙ୍କ ସିଟ୍ ସଂରକ୍ଷିତ। ଆଜି ଠାରୁ ସଂକଳ୍ପ ଆରମ୍ଭ କରନ୍ତୁ।",
      desc: "ନିଜ ଗାଁ ସହାୟକଙ୍କୁ ଭେଟନ୍ତୁ, ପବିତ୍ର ତୀର୍ଥ ବାଛନ୍ତୁ, ପହିଲେ ଯାତ୍ରା କରନ୍ତୁ — ପଛରେ ଶୋଧ।",
      btn: "ମୋ ଯାତ୍ରା ପ୍ଲାନ୍ କରନ୍ତୁ",
      btnAlt: "ପୁରୁଣା ପାସ୍ ଦେଖନ୍ତୁ"
    },
    finder: {
      destLbl: "ଗନ୍ତବ୍ୟ ସ୍ଥାନ",
      styleLbl: "ଯାତ୍ରା ଶୈଳୀ",
      allDest: "ଭାରତର ଯେ କୌଣସି ସ୍ଥାନ",
      allStyle: "ଯେ କୌଣସି ଶୈଳୀ",
      btn: "ମୋ ଯାତ୍ରା ଖୋଜ",
      styleNames: { devotion: "ଆଧ୍ୟାତ୍ମିକ", adventure: "ସାହସିକ", culture: "ସଂସ୍କୃତି", coastal: "ସମୁଦ୍ରତୀର" }
    }
  },
  en: {
    nav: {
      circuits: "Sacred Circuits",
      advantage: "Micro-EMI Advantage",
      calculator: "Sanchay Calculator",
      highway: "Yatra Highway",
      pass: "Travel Pass",
      agentLogin: "Sahayak Portal",
      checkPassBtn: "Check Travel Pass"
    },
    hero: {
      badge: "JAI JAGANNATH • ADITYA TOUR & TRAVELS — SACRED PILGRIMAGE NETWORK FROM ODISHA",
      titleA: "Sacred Dhams",
      titleB: "from Odisha",
      punchline: "No full upfront payment stress! Board your coach after paying just 2 micro-installments, and comfortably clear the remaining balance after returning home.",
      point1: "Zero Bank CIBIL or Formal Loan Stress",
      point2: "100% Pure Satvik Meals (No Onion, No Garlic)",
      point3: "Direct Premium Deluxe Bus Pickup from All 30 Odisha Districts",
      btnExplore: "Explore Tour Circuits",
      btnVerify: "Check Booking Pass",
      stat1Lbl: "Odisha Pilgrims Facilitated",
      stat2Lbl: "Devotee Satisfaction & Trust",
      stat3Lbl: "Panchayat Desks in 30 Districts",
      stat4Lbl: "Pure Satvik Prasad Guaranteed"
    },
    highway: {
      tag: "PILGRIMAGE HIGHWAY • ADITYA TOUR & TRAVELS",
      title: "From Your Home to Sacred Dhams & Safe Return",
      desc: "Four simple steps from your doorstep to the sacred dhams — and back home again:",
      step1: "STEP 1",
      step2: "STEP 2",
      step3: "STEP 3",
      step4: "STEP 4",
      p1Name: "Sankalpa at Home",
      p1Month: "Month 01",
      p2Name: "Coach Boarding",
      p2Month: "Month 02",
      p3Name: "Sacred Darshan",
      p3Month: "Char Dham",
      p4Name: "Peaceful Return",
      p4Month: "Month 03-10",
      m1Desc: "Receive your physical passbook from your village Sahayak. Seat reserved.",
      m2Desc: "Travel unlocked after just 2 payments! Board the premium deluxe bus.",
      m3Desc: "Kedarnath, Kashi & Ayodhya VIP darshan with hot satvik meals prepared onboard.",
      m4Desc: "Return home with divine blessings. Settle remaining EMIs aligned with your harvest.",
      banner: "Premium Deluxe Bus with Emergency Paramedic & Satvik Kitchen"
    },
    calculator: {
      tag: "GRAMIN SANCHAY CALCULATOR",
      title: "Calculate Your Daily Micro-Savings",
      desc: "Compare the cost of 2 morning cups of tea to the divine blessings of a lifetime. Select your destination and repayment tenure.",
      choosePkg: "1. Choose Sacred Package",
      chooseTenure: "2. Repayment Duration",
      statusLbl: "Boarding Clearance Status",
      unlockMsg: "Travel unlocked after just 2 monthly payments!",
      estEmiLbl: "Estimated Micro-EMI",
      perMonth: "/ month",
      teaCompare: "Less than the price of 2 cups of tea / day",
      toBoardLbl: "Required to Board Coach:",
      postTravelLbl: "Post-Travel Balance:",
      channelLbl: "Collection Channel:",
      channelVal: "Gramin Sahayak Doorstep Slip",
      bookBtn: "Reserve Seat With Local Sahayak",
      months: "Months"
    },
    testimonials: {
      tag: "DEVOTEES SPEAK",
      title: "Trusted by Families Across Odisha",
      desc: "Real pilgrims, real villages — in the words of the families who travelled with us.",
      q1: "Baba and Maa had never crossed Odisha. After just two instalments we all boarded the deluxe coach and saw Kedarnath together — no loan, no stress.",
      n1: "Sunita Behera",
      p1: "Kendrapara • Char Dham Yatra",
      q2: "The Sahayak brother came home with our passbook and printed receipts. We never had to touch a bank or a smartphone.",
      n2: "Prakash Nayak",
      p2: "Sambalpur • Ayodhya–Kashi Darshan",
      q3: "Pure satvik khana, VIP darshan, and my parents rested the whole way. It felt like travelling with family, not an agency.",
      n3: "Mamani Digal",
      p3: "Kalahandi • Rameswaram Circuit"
    },
    cta: {
      tag: "BEGIN YOUR YATRA",
      title: "Your berth is reserved. Start the Sankalpa today.",
      desc: "Meet your village Sahayak, choose a sacred circuit, and travel first — settle later.",
      btn: "Plan My Yatra",
      btnAlt: "Check Existing Pass"
    },
    finder: {
      destLbl: "Destination",
      styleLbl: "Travel style",
      allDest: "Anywhere in India",
      allStyle: "Any adventure",
      btn: "Find my escape",
      styleNames: { devotion: "Devotion", adventure: "Adventure", culture: "Culture", coastal: "Beach" }
    }
  }
};

// Numeric metadata for the animated hero statistics
const STAT_META = {
  stat1: { value: 48000, format: "int", suffix: "+" },
  stat2: { value: 4.9, format: "dec1", suffix: " ★" },
  stat3: { value: 1450, format: "int", suffix: "+" },
  stat4: { value: 100, format: "int", suffix: "%" }
};

// Tour packages catalog loaded dynamically from PocketBase (/api/public/packages)
const TOUR_PACKAGES = [];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function landingApp() {
  return {
    lang: "odia", // 'odia' or 'en'
    packages: [],
    selectedPackage: null,
    selectedTenure: 9,
    finderDest: "all",
    finderStyle: "all",
    statusModalOpen: false,
    mobileMenuOpen: false,
    scrolled: false,
    emiPulse: false,
    scrollProgress: 0,
    statDisplay: { stat1: "", stat2: "", stat3: "", stat4: "" },

    t(section, key) {
      const current = I18N[this.lang] || I18N.odia;
      return current[section] && current[section][key] ? current[section][key] : "";
    },

    setLanguage(newLang) {
      this.lang = newLang;
      if (document.documentElement) {
        document.documentElement.lang = newLang === "odia" ? "or" : "en";
      }
      this.setStatDisplayFinal();
    },

    formatStatNumber(value, format) {
      const locale = this.lang === "odia" ? "or-IN" : "en-IN";
      try {
        if (format === "dec1") {
          return new Intl.NumberFormat(locale, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          }).format(value);
        }
        return new Intl.NumberFormat(locale).format(Math.round(value));
      } catch (e) {
        return format === "dec1"
          ? (Math.round(value * 10) / 10).toFixed(1)
          : String(Math.round(value));
      }
    },

    formatStat(key, rawValue) {
      const meta = STAT_META[key];
      const value = rawValue === undefined ? meta.value : rawValue;
      return this.formatStatNumber(value, meta.format) + meta.suffix;
    },

    setStatDisplayFinal() {
      Object.keys(STAT_META).forEach((key) => {
        this.statDisplay[key] = this.formatStat(key);
      });
    },

    animateStats() {
      if (prefersReducedMotion()) {
        this.setStatDisplayFinal();
        return;
      }
      const duration = 1100;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        Object.keys(STAT_META).forEach((key) => {
          this.statDisplay[key] = this.formatStat(key, STAT_META[key].value * eased);
        });
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          this.setStatDisplayFinal();
        }
      };
      Object.keys(STAT_META).forEach((key) => {
        this.statDisplay[key] = this.formatStat(key, 0);
      });
      requestAnimationFrame(tick);
    },

    init() {
      this.setStatDisplayFinal();
      document.documentElement.lang = this.lang === "odia" ? "or" : "en";

      this.$watch("monthlyEmi", () => {
        if (prefersReducedMotion()) return;
        this.emiPulse = false;
        this.$nextTick(() => {
          this.emiPulse = true;
          setTimeout(() => {
            this.emiPulse = false;
          }, 500);
        });
      });

      this.$watch("statusModalOpen", (open) => {
        if (!open) return;
        this.$nextTick(() => {
          if (this.$refs.statusInput) this.$refs.statusInput.focus();
        });
      });

      this.$watch("filteredPackages", () => {
        this.$nextTick(() => {
          this.initTilt();
          if (window.initReveals) window.initReveals();
        });
      });

      this.$nextTick(() => {
        this.animateStats();
        this.initTilt();
        this.initScrollMilestoneTracker();
        if (window.initReveals) window.initReveals();
      });

      // Admin-managed catalog: refresh from server, silently fall back to static defaults offline
      this.loadServerPackages();
    },

    async loadServerPackages() {
      try {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
        const res = await fetch("/api/public/packages", {
          cache: "no-store",
          signal: controller ? controller.signal : undefined
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) {
          this.packages = [];
          this.selectedPackage = null;
          return;
        }
        const data = await res.json();
        const serverPkgs = Array.isArray(data.packages) ? data.packages : [];

        // Filter out test dummy packages from automated test suites
        const isTestDummy = (p) => {
          const t = (p.title || "").toLowerCase();
          return t.startsWith("manifest yatra") || t.startsWith("portfolio yatra") || t.startsWith("test ") || t.includes("phase 3");
        };

        const list = [];
        for (const sp of serverPkgs) {
          if (isTestDummy(sp)) continue;
          const tenures = Array.isArray(sp.allowed_tenures) && sp.allowed_tenures.length
            ? sp.allowed_tenures.map((x) => Number(x)).filter((n) => !isNaN(n) && n > 0)
            : [6, 9, 12];
          list.push({
            id: sp.id,
            title: sp.title || "Pilgrimage Yatra",
            destination: sp.destination || "Odisha direct pilgrimage",
            duration_days: Number(sp.duration_days) || 7,
            total_price: Number(sp.total_price) || 20000,
            allowed_tenures: tenures,
            min_emis_to_travel: Number(sp.min_emis_to_travel) || 2,
            image: sp.cover_image_url || "/images/hero-1.jpg",
            badge: "Sacred Yatra",
            style: "devotion",
            highlights: [],
            odia_title: sp.title || "",
            odia_destination: sp.destination || ""
          });
        }

        this.packages = list;
        if (list.length > 0) {
          const stillSelected = list.find((p) => this.selectedPackage && p.id === this.selectedPackage.id);
          this.selectedPackage = stillSelected || list[0];
          const validTenures = (this.selectedPackage && Array.isArray(this.selectedPackage.allowed_tenures) && this.selectedPackage.allowed_tenures.length)
            ? this.selectedPackage.allowed_tenures
            : [6, 9, 12];
          if (!validTenures.includes(this.selectedTenure)) {
            this.selectedTenure = validTenures[0];
          }
        } else {
          this.selectedPackage = null;
        }
        this.$nextTick(() => this.initTilt());
      } catch (err) {
        console.warn("Could not load packages from server:", err);
        this.packages = [];
        this.selectedPackage = null;
      }
    },

    get filteredPackages() {
      const dest = this.finderDest;
      const style = this.finderStyle;
      const list = Array.isArray(this.packages) ? this.packages : [];
      return list.filter((p) => {
        const destOk = dest === "all" || (p.destination || "").toLowerCase().includes(dest.toLowerCase()) || (p.title || "").toLowerCase().includes(dest.toLowerCase());
        const styleOk = style === "all" || (p.style || "") === style;
        return destOk && styleOk;
      });
    },

    // Limit calculator to 3-4 curated packages only
    get calculatorPackages() {
      const base = Array.isArray(this.packages) ? this.packages : [];
      const core = base.slice(0, 4);
      // If user selected a package outside the first 4, include it so the selected card is visible
      if (this.selectedPackage && !core.some((p) => p.id === this.selectedPackage.id)) {
        return [this.selectedPackage, ...core.slice(0, 3)];
      }
      return core;
    },

    get monthlyEmi() {
      if (!this.selectedPackage || !this.selectedTenure || this.selectedTenure <= 0) return 0;
      const price = Number(this.selectedPackage.total_price) || 0;
      return Math.round(price / this.selectedTenure);
    },

    get dailyCost() {
      return Math.round(this.monthlyEmi / 30);
    },

    get minEmis() {
      return (this.selectedPackage && Number(this.selectedPackage.min_emis_to_travel))
        ? Number(this.selectedPackage.min_emis_to_travel)
        : 2;
    },

    get travelUnlockCost() {
      return this.monthlyEmi * this.minEmis;
    },

    get remainingBalance() {
      if (!this.selectedPackage) return 0;
      const price = Number(this.selectedPackage.total_price) || 0;
      return Math.max(0, price - this.travelUnlockCost);
    },

    get remainingTenure() {
      if (!this.selectedTenure) return 0;
      return Math.max(0, this.selectedTenure - this.minEmis);
    },

    get progressPercent() {
      if (!this.selectedTenure) return 33;
      return Math.min(100, Math.round((this.minEmis / this.selectedTenure) * 100));
    },

    selectPackage(pkg) {
      if (!pkg) return;
      this.selectedPackage = pkg;
      const validTenures = (Array.isArray(pkg.allowed_tenures) && pkg.allowed_tenures.length)
        ? pkg.allowed_tenures
        : [6, 9, 12];
      if (!validTenures.includes(this.selectedTenure)) {
        this.selectedTenure = validTenures[0];
      }
      const calcEl = document.getElementById("emi-calculator-section");
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: "smooth" });
      }
    },

    initTilt() {
      if (window.VanillaTilt) {
        const cards = document.querySelectorAll(".package-tilt-card");
        window.VanillaTilt.init(cards, {
          max: 8,
          perspective: 1000,
          speed: 400,
          glare: true,
          "max-glare": 0.15,
          scale: 1.01
        });
      }
    },

    initScrollMilestoneTracker() {
      const heroMedia = document.getElementById("hero-media");
      const enableParallax = !prefersReducedMotion() && !!heroMedia;
      window.addEventListener(
        "scroll",
        () => {
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          this.scrolled = scrollTop > 8;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress =
            docHeight > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100))) : 0;
          this.scrollProgress = progress;

          // Light hero parallax: media drifts slower than the page
          if (enableParallax && scrollTop < window.innerHeight * 1.3) {
            heroMedia.style.transform = "translate3d(0, " + scrollTop * 0.12 + "px, 0)";
          }
        },
        { passive: true }
      );
    },

    scrollToSection(sectionId) {
      this.mobileMenuOpen = false;
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };
}

window.landingApp = landingApp;
