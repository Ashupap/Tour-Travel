// pb_public/js/landing.js
// BharatYatra PWA — Bilingual (Odia & English) Landing Page State & Highway Milestone Tracker

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
      badge: "🙏 ଜୟ ଜଗନ୍ନାଥ • ଆମ ଓଡ଼ିଶାର ନିଜସ୍ୱ ତୀର୍ଥଯାତ୍ରା ସେବା",
      title1: "ଆମ ଓଡ଼ିଶାରୁ ଚାରିଧାମ ଯାତ୍ରା",
      title2: "ବିଳାସପୂର୍ଣ୍ଣ ସ୍ଲିପର ବସ୍ ରେ ମା' ବାପାଙ୍କୁ ପବିତ୍ର ତୀର୍ଥ କରାନ୍ତୁ",
      punchline: "ପୂରା ଟଙ୍କାର ଚିନ୍ତା ନାହିଁ! ମାତ୍ର ଦୁଇଟି କିସ୍ତି ପରେ ବସ୍ ରେ ବସନ୍ତୁ, ବାକି ଟଙ୍କା ଧାମ ଦର୍ଶନ ସାରି ଘରକୁ ଫେରିବା ପରେ ସହଜରେ ଶୁଝନ୍ତୁ।",
      point1: "କୌଣସି ବ୍ୟାଙ୍କ ଋଣ ବା CIBIL ଚିନ୍ତା ନାହିଁ",
      point2: "୧୦୦% ଖାଣ୍ଟି ସାତ୍ତ୍ୱିକ ଆହାର (ବିନା ପିଆଜ-ରସୁଣ)",
      point3: "ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲାରୁ ସିଧାସଳଖ ବସ୍ ପିକଅପ୍",
      btnExplore: "ତୀର୍ଥ ପ୍ୟାକେଜ୍ ଦେଖନ୍ତୁ",
      btnVerify: "ମୋ ବୁକିଂ ପାସ୍ ଦେଖିବି",
      stat1Val: "୪୮,୦୦୦+",
      stat1Lbl: "ଓଡ଼ିଶାର ତୀର୍ଥଯାତ୍ରୀ ଯାଇସାରିଛନ୍ତି",
      stat2Val: "୪.୯ ★",
      stat2Lbl: "ଭକ୍ତଙ୍କ ଆଶୀର୍ବାଦ ଓ ସନ୍ତୋଷ",
      stat3Val: "୧,୪୫୦+",
      stat3Lbl: "ଗ୍ରାମ ପଞ୍ଚାୟତରେ ନିଜ ସହାୟକ",
      stat4Val: "୧୦୦%",
      stat4Lbl: "ଖାଣ୍ଟି ସାତ୍ତ୍ୱିକ ପ୍ରସାଦ ନିଶ୍ଚିତ"
    },
    highway: {
      tag: "ଯାତ୍ରା ରାଜପଥ • BHARATYATRA HIGHWAY",
      title: "ଘରୁ ଧାମ ପର୍ଯ୍ୟନ୍ତ ନିଶ୍ଚିନ୍ତ ଯାତ୍ରା",
      desc: "କଳା ପିଚୁ ରାସ୍ତାରେ ଆଗେଇ ଚାଲିଛି ଆପଣଙ୍କ ସ୍ଲିପର ବସ୍। ଦେଖନ୍ତୁ କିପରି ସହଜରେ ପୂରଣ ହେବ ତୀର୍ଥ ସ୍ୱପ୍ନ:",
      m1Title: "୧. ଘରୁ ସଂକଳ୍ପ (ମାସ ୦୧)",
      m1Desc: "ଘରେ ବସି ନିଜ ସହାୟକ ଭାଇଙ୍କ ଠାରୁ ପାସବୁକ୍ ପାଆନ୍ତୁ। ସିଟ୍ ସଂରକ୍ଷିତ ହେଲା।",
      m2Title: "୨. ବସ୍ ଚଢ଼ିବା ଅନୁମତି (ମାସ ୦୨)",
      m2Desc: "କେବଳ ଦ୍ୱିତୀୟ କିସ୍ତି ପରେ ଟିକେଟ୍ ଅନଲକ୍! ଚଢ଼ନ୍ତୁ ୫-ଷ୍ଟାର ଏସି ସ୍ଲିପର ବସ୍ ରେ।",
      m3Title: "୩. ପବିତ୍ର ଧାମ ଦର୍ଶନ",
      m3Desc: "କେଦାରନାଥ, କାଶୀ ଓ ଅଯୋଧ୍ୟାରେ ଭିଆଇପି ଦର୍ଶନ ଓ ସାତ୍ତ୍ୱିକ ମହାପ୍ରସାଦ।",
      m4Title: "୪. ସୁରକ୍ଷିତ ଘରକୁ ଫେରିବା",
      m4Desc: "ଶାନ୍ତିରେ ଘରକୁ ଫେରି ଫସଲ ଅମଳ ଅନୁସାରେ ଛୋଟ ଛୋଟ କିସ୍ତିରେ ବାକି ଶୁଝନ୍ତୁ।"
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
      bookBtn: "ଘରେ ବସି ବୁକିଂ ଅନୁରୋଧ କରନ୍ତୁ"
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
      badge: "🙏 JAI JAGANNATH • Dedicated Pilgrimage Network from Odisha",
      title1: "Sacred Dhams from Odisha",
      title2: "Travel in Royal 5-Star Sleeper Coaches with Zero Financial Strain",
      punchline: "No full upfront payment stress! Board your coach after paying just 2 micro-installments, and comfortably clear the remaining balance after returning home.",
      point1: "Zero Bank CIBIL or Formal Loan Stress",
      point2: "100% Pure Satvik Meals (No Onion, No Garlic)",
      point3: "Direct Luxury Bus Pickup from All 30 Odisha Districts",
      btnExplore: "Explore Tour Circuits",
      btnVerify: "Check Booking Pass",
      stat1Val: "48,000+",
      stat1Lbl: "Odisha Pilgrims Facilitated",
      stat2Val: "4.9 ★",
      stat2Lbl: "Devotee Satisfaction & Trust",
      stat3Val: "1,450+",
      stat3Lbl: "Panchayat Desks in 30 Districts",
      stat4Val: "100%",
      stat4Lbl: "Pure Satvik Prasad Guaranteed"
    },
    highway: {
      tag: "PILGRIMAGE HIGHWAY • JOURNEY ROADMAP",
      title: "From Your Home to Sacred Dhams & Safe Return",
      desc: "Our royal sleeper coach navigates the sacred highway. See how your dream pilgrimage unfolds step by step:",
      m1Title: "1. Sankalpa at Home (Month 01)",
      m1Desc: "Receive your physical passbook from your village Sahayak. Seat reserved.",
      m2Title: "2. Coach Clearance (Month 02)",
      m2Desc: "Travel unlocked after just 2 payments! Board the luxury 5-star AC sleeper.",
      m3Title: "3. Sacred Dham Darshan",
      m3Desc: "Kedarnath, Kashi & Ayodhya VIP darshan with hot satvik meals prepared onboard.",
      m4Title: "4. Peaceful Home Return",
      m4Desc: "Return home with divine blessings. Settle remaining EMIs aligned with your harvest."
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
      bookBtn: "Reserve Seat With Local Sahayak"
    }
  }
};

const TOUR_PACKAGES = [
  {
    id: "pkg-chardham",
    title: "Char Dham Himalayan Yatra",
    odia_title: "ଚାରିଧାମ ମହାଯାତ୍ରା (Char Dham)",
    destination: "Bhubaneswar/Cuttack ru direct → Yamunotri • Gangotri • Kedarnath • Badrinath",
    odia_destination: "ଭୁବନେଶ୍ୱର/କଟକରୁ ସିଧାସଳଖ → ଯମୁନୋତ୍ରୀ • ଗଙ୍ଗୋତ୍ରୀ • କେଦାରନାଥ • ବଦ୍ରିନାଥ",
    pickup_points: "Bhubaneswar, Cuttack, Balasore, Berhampur",
    duration_days: 12,
    total_price: 36000,
    allowed_tenures: [6, 9, 12],
    min_emis_to_travel: 2,
    badge: "Most Sacred • ବହୁତ ଲୋକପ୍ରିୟ",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD7tQda4ONtO4XduQSsRgMs_cQJr9gS4okjrDXbJvJ66IU7hUjeuEQ4VgLZdF9SxqQ-6A7oCVps105SdJADiN9a4xItaXOoLybFaSUaA_ekEocjLyvjWjitv82d5_nlbKUzDvjyTHZQt8V6fZartdU0ZzWK8qs5vnFe7L_hJM3oVs1vRGwQTMO5tFMbHgOYDevQfH52Te695mTDEv_yYvuaGJ_kajeKRJw0dJ-zPwPlAi1UuADNj2fIVuI7sCW_bSECIx2fp1PY1wVu",
    highlights: ["AC Sleeper Coach with Blanket", "VIP Kedarnath Helipad/Pony Support", "Pure Satvik Aahar (No Onion-Garlic)"]
  },
  {
    id: "pkg-ayodhya-kashi",
    title: "Ayodhya & Kashi Vishwanath Darshan",
    odia_title: "ଅଯୋଧ୍ୟା ଓ କାଶୀ ବିଶ୍ୱନାଥ (Ayodhya-Kashi)",
    destination: "Odisha ru direct → Ayodhya Ram Mandir • Kashi Vishwanath • Prayagraj Triveni Sangam",
    odia_destination: "ଓଡ଼ିଶାରୁ ସିଧାସଳଖ → ଅଯୋଧ୍ୟା ରାମ ମନ୍ଦିର • କାଶୀ ବିଶ୍ୱନାଥ • ପ୍ରୟାଗରାଜ ସଙ୍ଗମ",
    pickup_points: "Bhubaneswar, Sambalpur, Rourkela, Cuttack",
    duration_days: 6,
    total_price: 18000,
    allowed_tenures: [3, 6, 9],
    min_emis_to_travel: 2,
    badge: "Ram Lalla Special • ରାମ ଦର୍ଶନ",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKzylWbgZ-XOAGBQ-jqf9QFNfEHdQEq1sxTdVgDJ_ypeV80p59An60jNyURW4-VFe88YaIsn0CmG2wbVfsDKZ3e7P9SMfEfqssl7eRfUsB0PQ_zypB3W4EcVMvpxuQVKM5ThhbDOBmDbUO42Dqe2rUSJn5S5QPEA2bnKanbb65Y2-DmhZLhr4zwHO3gm6wZAdVUyE1JZhyAh3--jVFLDTDoQhgpRtRoIqgqHm2TtuIei95AsCmK7xoWeYtxic8ZNfL_kG9a5Qx-Gg6",
    highlights: ["Ram Lalla VIP Darshan", "Ganga Maha Aarti Boat Ride", "Elderly Special Care (Zero Walk)"]
  },
  {
    id: "pkg-jyotirlinga",
    title: "12 Jyotirlinga Mahayatra (Phase 1)",
    odia_title: "୧୨ ଜ୍ୟୋତିର୍ଲିଙ୍ଗ ଯାତ୍ରା (Jyotirlinga)",
    destination: "Somnath • Mahakaleshwar Ujjain • Omkareshwar • Nageshwar",
    odia_destination: "ସୋମନାଥ • ମହାକାଳେଶ୍ୱର ଉଜ୍ଜୟିନୀ • ଓଁକାରେଶ୍ୱର • ନାଗେଶ୍ୱର",
    pickup_points: "Bhubaneswar, Angul, Sambalpur, Jharsuguda",
    duration_days: 9,
    total_price: 27000,
    allowed_tenures: [6, 9, 12],
    min_emis_to_travel: 2,
    badge: "Shiva Mahayatra • ମହାକାଳ ଦର୍ଶନ",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBy3nNUBbzm-RFmWiKnfDmbG1j7zqaJjvRyWpFcWs25ckUOnfK_mJOKJV7WvfnNTYZXyC4dHdWat-O9qikjJeb2vqpSON1Hrul0Ap3fSr546UEI9JHByaqAIPZP9Hu3J1Tz2xFB2IyRBNW_rexi0qX-6j4f4_BaAQqRwlsbo7mBdWHaALk41-TyN-kJ1Ia6YIimJlnuVgGml6PVyAd2gp_qnWkT7GS-uZ2JzfdGYkiqpfxayIdTyGlGgzBvUmeTbDkQEdW4D3mtqX1y",
    highlights: ["Bhasma Aarti Access", "Double-Decker Sleeper Comfort", "Purohit Special Puja Service"]
  },
  {
    id: "pkg-south-circuit",
    title: "South India & Rameswaram Circuit",
    odia_title: "ଦକ୍ଷିଣ ଭାରତ ଓ ରାମେଶ୍ୱରମ୍ (Rameswaram)",
    destination: "Rameswaram Ramanathaswamy • Madurai Meenakshi • Kanyakumari",
    odia_destination: "ରାମେଶ୍ୱରମ୍ ରାମନାଥସ୍ୱାମୀ • ମଦୁରାଇ ମୀନାକ୍ଷୀ • କନ୍ୟାକୁମାରୀ",
    pickup_points: "Berhampur, Bhubaneswar, Balasore",
    duration_days: 8,
    total_price: 24000,
    allowed_tenures: [6, 9, 12],
    min_emis_to_travel: 2,
    badge: "Coastal Dham • ପବିତ୍ର ତୀର୍ଥ",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYO8Loj8Ze3kn_iktEx6p0PV40jzHXKbvXAXm-Q5n4FbcPwgnLMhnfmlrF58c5Jjbk_XoxHqlqaIurBFDnkXBc-oEwIRB1PDpw7428m9U0oOkTT0-330Tv6U-GWupD6oZPRrVav5tLfj1dC12DjYopAyRYd_a3c2XxJD--q8UIxvuarDrnTKE1_EKqCUHv97h_XnW7u2UMPI9JODpqgMwZCWjSpGktdFzCKKaKVbsoyuTP7WgChBo4bNSi4EbG_REOwZiCLMUqRKOn",
    highlights: ["22 Holy Theertham Snan", "Odisha Special Satvik Cooks", "Pamban Sea Bridge View"]
  }
];

function landingApp() {
  return {
    lang: "odia", // 'odia' or 'en'
    packages: TOUR_PACKAGES,
    selectedPackage: TOUR_PACKAGES[0],
    selectedTenure: 9,
    statusModalOpen: false,
    scrollProgress: 0,
    currentMilestone: 1,

    t(section, key) {
      const current = I18N[this.lang] || I18N.odia;
      return current[section] && current[section][key] ? current[section][key] : "";
    },

    setLanguage(newLang) {
      this.lang = newLang;
    },

    init() {
      this.$nextTick(() => {
        this.initTilt();
        this.initScrollMilestoneTracker();
      });
    },

    get monthlyEmi() {
      if (!this.selectedPackage || !this.selectedTenure) return 0;
      return Math.round(this.selectedPackage.total_price / this.selectedTenure);
    },

    get dailyCost() {
      return Math.round(this.monthlyEmi / 30);
    },

    get minEmis() {
      return this.selectedPackage ? this.selectedPackage.min_emis_to_travel : 2;
    },

    get travelUnlockCost() {
      return this.monthlyEmi * this.minEmis;
    },

    get remainingBalance() {
      if (!this.selectedPackage) return 0;
      return this.selectedPackage.total_price - this.travelUnlockCost;
    },

    get remainingTenure() {
      return Math.max(0, this.selectedTenure - this.minEmis);
    },

    get progressPercent() {
      if (!this.selectedTenure) return 33;
      return Math.min(100, Math.round((this.minEmis / this.selectedTenure) * 100));
    },

    selectPackage(pkg) {
      this.selectedPackage = pkg;
      if (!pkg.allowed_tenures.includes(this.selectedTenure)) {
        this.selectedTenure = pkg.allowed_tenures[0];
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
      window.addEventListener("scroll", () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100))) : 0;
        this.scrollProgress = progress;

        // 4 Milestones across page scroll:
        // 1. Sankalpa (0-25%)
        // 2. Board Bus (25-50%)
        // 3. Darshan & Prasad (50-75%)
        // 4. Safe Return (75-100%)
        if (progress < 25) {
          this.currentMilestone = 1;
        } else if (progress < 50) {
          this.currentMilestone = 2;
        } else if (progress < 75) {
          this.currentMilestone = 3;
        } else {
          this.currentMilestone = 4;
        }
      }, { passive: true });
    },

    scrollToSection(sectionId) {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };
}

window.landingApp = landingApp;
