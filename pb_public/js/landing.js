// pb_public/js/landing.js
// Landing page interactive state: Alpine.js EMI Calculator & Vanilla-Tilt initialization (LAND-02, LAND-03)

const TOUR_PACKAGES = [
  {
    id: "pkg-chardham",
    title: "Char Dham Himalayan Yatra",
    destination: "Yamunotri • Gangotri • Kedarnath • Badrinath",
    duration_days: 12,
    total_price: 36000,
    allowed_tenures: [6, 9, 12],
    min_emis_to_travel: 2,
    badge: "Most Sacred",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD7tQda4ONtO4XduQSsRgMs_cQJr9gS4okjrDXbJvJ66IU7hUjeuEQ4VgLZdF9SxqQ-6A7oCVps105SdJADiN9a4xItaXOoLybFaSUaA_ekEocjLyvjWjitv82d5_nlbKUzDvjyTHZQt8V6fZartdU0ZzWK8qs5vnFe7L_hJM3oVs1vRGwQTMO5tFMbHgOYDevQfH52Te695mTDEv_yYvuaGJ_kajeKRJw0dJ-zPwPlAi1UuADNj2fIVuI7sCW_bSECIx2fp1PY1wVu",
    highlights: ["5-Star Sleeper Coach", "VIP Kedarnath Helipad/Pony", "Satvik Prasadam"]
  },
  {
    id: "pkg-jyotirlinga",
    title: "12 Jyotirlinga Mahayatra",
    destination: "Somnath • Mahakaleshwar • Omkareshwar • Nageshwar",
    duration_days: 9,
    total_price: 27000,
    allowed_tenures: [6, 9, 12],
    min_emis_to_travel: 2,
    badge: "Shiva Mahayatra",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBy3nNUBbzm-RFmWiKnfDmbG1j7zqaJjvRyWpFcWs25ckUOnfK_mJOKJV7WvfnNTYZXyC4dHdWat-O9qikjJeb2vqpSON1Hrul0Ap3fSr546UEI9JHByaqAIPZP9Hu3J1Tz2xFB2IyRBNW_rexi0qX-6j4f4_BaAQqRwlsbo7mBdWHaALk41-TyN-kJ1Ia6YIimJlnuVgGml6PVyAd2gp_qnWkT7GS-uZ2JzfdGYkiqpfxayIdTyGlGgzBvUmeTbDkQEdW4D3mtqX1y",
    highlights: ["Bhasma Aarti Access", "Double-Decker Sleeper", "Certified Purohit Guidance"]
  },
  {
    id: "pkg-ayodhya",
    title: "Ayodhya & Kashi Darshan",
    destination: "Ayodhya Ram Mandir • Kashi Vishwanath • Prayagraj",
    duration_days: 6,
    total_price: 18000,
    allowed_tenures: [3, 6, 9],
    min_emis_to_travel: 2,
    badge: "Ram Lalla Special",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKzylWbgZ-XOAGBQ-jqf9QFNfEHdQEq1sxTdVgDJ_ypeV80p59An60jNyURW4-VFe88YaIsn0CmG2wbVfsDKZ3e7P9SMfEfqssl7eRfUsB0PQ_zypB3W4EcVMvpxuQVKM5ThhbDOBmDbUO42Dqe2rUSJn5S5QPEA2bnKanbb65Y2-DmhZLhr4zwHO3gm6wZAdVUyE1JZhyAh3--jVFLDTDoQhgpRtRoIqgqHm2TtuIei95AsCmK7xoWeYtxic8ZNfL_kG9a5Qx-Gg6",
    highlights: ["Ganga Maha Aarti Boat", "Triveni Sangam Snan", "Zero Walking Hassle"]
  },
  {
    id: "pkg-south",
    title: "South Divine Circuit",
    destination: "Rameswaram Ramanathaswamy • Madurai Meenakshi • Dhanushkodi",
    duration_days: 8,
    total_price: 24000,
    allowed_tenures: [6, 9, 12],
    min_emis_to_travel: 2,
    badge: "Coastal Dham",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYO8Loj8Ze3kn_iktEx6p0PV40jzHXKbvXAXm-Q5n4FbcPwgnLMhnfmlrF58c5Jjbk_XoxHqlqaIurBFDnkXBc-oEwIRB1PDpw7428m9U0oOkTT0-330Tv6U-GWupD6oZPRrVav5tLfj1dC12DjYopAyRYd_a3c2XxJD--q8UIxvuarDrnTKE1_EKqCUHv97h_XnW7u2UMPI9JODpqgMwZCWjSpGktdFzCKKaKVbsoyuTP7WgChBo4bNSi4EbG_REOwZiCLMUqRKOn",
    highlights: ["22 Holy Theertham Wells", "South Satvik Meals", "Pamban Bridge Ride"]
  }
];

function landingApp() {
  return {
    packages: TOUR_PACKAGES,
    selectedPackage: TOUR_PACKAGES[0],
    selectedTenure: 9,
    statusModalOpen: false,

    init() {
      this.$nextTick(() => {
        this.initTilt();
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
          max: 12,
          perspective: 1000,
          speed: 400,
          glare: true,
          "max-glare": 0.25,
          scale: 1.02
        });
      }
    }
  };
}

window.landingApp = landingApp;
