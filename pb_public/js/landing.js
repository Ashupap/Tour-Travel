// pb_public/js/landing.js
// Landing page interactive state: Alpine.js EMI Calculator, Milestone Bus Tracker & Vanilla-Tilt (LAND-02, LAND-03)

const TOUR_PACKAGES = [
  {
    id: "pkg-chardham",
    title: "Char Dham Himalayan Yatra",
    odia_title: "ଚାରିଧାମ ମହାଯାତ୍ରା (Char Dham)",
    destination: "Bhubaneswar/Cuttack ru direct → Yamunotri • Gangotri • Kedarnath • Badrinath",
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
    packages: TOUR_PACKAGES,
    selectedPackage: TOUR_PACKAGES[0],
    selectedTenure: 9,
    statusModalOpen: false,
    activeHeroTab: 0,
    scrollProgress: 0,
    currentMilestone: 1,

    heroDestinations: [
      {
        name: "Puri Jagannath Dham",
        subtitle: "Ama Bada Danda & Rath Yatra Blessings",
        desc: "Prathame Mahaprabhu Jagannath nka aashirvada nei yatra aarambha!",
        image: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Lord_Jagannath_temple_at_night.jpg"
      },
      {
        name: "Kedarnath Dham (Himalaya)",
        subtitle: "Snow peaks & Mahadev Darshan",
        desc: "Himalaya ra barapha pahada majhire Baba Kedar nka divya darshan.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD7tQda4ONtO4XduQSsRgMs_cQJr9gS4okjrDXbJvJ66IU7hUjeuEQ4VgLZdF9SxqQ-6A7oCVps105SdJADiN9a4xItaXOoLybFaSUaA_ekEocjLyvjWjitv82d5_nlbKUzDvjyTHZQt8V6fZartdU0ZzWK8qs5vnFe7L_hJM3oVs1vRGwQTMO5tFMbHgOYDevQfH52Te695mTDEv_yYvuaGJ_kajeKRJw0dJ-zPwPlAi1UuADNj2fIVuI7sCW_bSECIx2fp1PY1wVu"
      },
      {
        name: "Ayodhya Ram Janmabhoomi",
        subtitle: "Divya Ram Lalla Darshan",
        desc: "Naba nirmita grand Ram Mandir re bhaba darshan zero walking burden re.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKzylWbgZ-XOAGBQ-jqf9QFNfEHdQEq1sxTdVgDJ_ypeV80p59An60jNyURW4-VFe88YaIsn0CmG2wbVfsDKZ3e7P9SMfEfqssl7eRfUsB0PQ_zypB3W4EcVMvpxuQVKM5ThhbDOBmDbUO42Dqe2rUSJn5S5QPEA2bnKanbb65Y2-DmhZLhr4zwHO3gm6wZAdVUyE1JZhyAh3--jVFLDTDoQhgpRtRoIqgqHm2TtuIei95AsCmK7xoWeYtxic8ZNfL_kG9a5Qx-Gg6"
      },
      {
        name: "Kashi Vishwanath & Ganga Ghat",
        subtitle: "Maha Aarti & Triveni Sangam Snan",
        desc: "Sandhya bela Kashi re Ganga Aarti ra apoorba anubhuti.",
        image: "https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=1200&q=80"
      },
      {
        name: "Rameswaram Dham",
        subtitle: "Dakshina Dham & 22 Kund Snan",
        desc: "Pamban bridge upare sundara bus yatra o pavitra theertham snan.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYO8Loj8Ze3kn_iktEx6p0PV40jzHXKbvXAXm-Q5n4FbcPwgnLMhnfmlrF58c5Jjbk_XoxHqlqaIurBFDnkXBc-oEwIRB1PDpw7428m9U0oOkTT0-330Tv6U-GWupD6oZPRrVav5tLfj1dC12DjYopAyRYd_a3c2XxJD--q8UIxvuarDrnTKE1_EKqCUHv97h_XnW7u2UMPI9JODpqgMwZCWjSpGktdFzCKKaKVbsoyuTP7WgChBo4bNSi4EbG_REOwZiCLMUqRKOn"
      }
    ],

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
          max: 10,
          perspective: 1000,
          speed: 400,
          glare: true,
          "max-glare": 0.2,
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

        // Milestones based on scroll depth:
        // 1: Sankalpa (0-25%)
        // 2: Board Bus (25-55%)
        // 3: Darshan & Prasad (55-80%)
        // 4: Safe Return & Easy EMI (80-100%)
        if (progress < 25) {
          this.currentMilestone = 1;
        } else if (progress < 55) {
          this.currentMilestone = 2;
        } else if (progress < 80) {
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
