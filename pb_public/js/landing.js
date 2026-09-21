// pb_public/js/landing.js
// Landing page interactive state: Alpine.js EMI Calculator & Vanilla-Tilt initialization (LAND-02, LAND-03)

const TOUR_PACKAGES = [
  {
    id: "pkg-chardham",
    title: "Char Dham Yatra",
    destination: "Uttarakhand (Kedarnath, Badrinath, Gangotri, Yamunotri)",
    duration_days: 12,
    total_price: 36000,
    allowed_tenures: [6, 9, 12],
    min_emis_to_travel: 2,
    badge: "Most Sacred",
    gradient: "from-amber-600 via-orange-600 to-amber-800"
  },
  {
    id: "pkg-vaishno",
    title: "Vaishno Devi & Kashmir Valley",
    destination: "Katra, Srinagar, Gulmarg, Pahalgam",
    duration_days: 8,
    total_price: 24000,
    allowed_tenures: [3, 6, 9],
    min_emis_to_travel: 2,
    badge: "Popular Family Tour",
    gradient: "from-cyan-600 via-blue-600 to-indigo-800"
  },
  {
    id: "pkg-kashi",
    title: "Kashi, Ayodhya & Prayagraj",
    destination: "Varanasi, Ayodhya Ram Mandir, Triveni Sangam",
    duration_days: 6,
    total_price: 18000,
    allowed_tenures: [3, 6, 9],
    min_emis_to_travel: 2,
    badge: "Spiritual Heritage",
    gradient: "from-yellow-600 via-amber-600 to-red-800"
  },
  {
    id: "pkg-south",
    title: "Grand South Temple Circuit",
    destination: "Madurai, Rameswaram, Kanyakumari, Tirupati",
    duration_days: 10,
    total_price: 30000,
    allowed_tenures: [6, 9, 12],
    min_emis_to_travel: 3,
    badge: "Divine Architecture",
    gradient: "from-emerald-600 via-teal-700 to-slate-900"
  },
  {
    id: "pkg-rajasthan",
    title: "Royal Rajasthan Heritage",
    destination: "Jaipur, Jodhpur, Udaipur, Jaisalmer Desert",
    duration_days: 7,
    total_price: 22000,
    allowed_tenures: [3, 6, 9],
    min_emis_to_travel: 2,
    badge: "Forts & Palaces",
    gradient: "from-rose-600 via-pink-700 to-amber-900"
  },
  {
    id: "pkg-goa",
    title: "Goa & Konkan Coastal Voyage",
    destination: "North Goa Beaches, Dudhsagar, Gokarna",
    duration_days: 5,
    total_price: 15000,
    allowed_tenures: [3, 6],
    min_emis_to_travel: 2,
    badge: "Leisure & Coastal",
    gradient: "from-teal-600 via-sky-600 to-indigo-900"
  }
];

function landingApp() {
  return {
    packages: TOUR_PACKAGES,
    selectedPackage: TOUR_PACKAGES[0],
    selectedTenure: 6,
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

    get minEmis() {
      return this.selectedPackage ? this.selectedPackage.min_emis_to_travel : 2;
    },

    get travelUnlockCost() {
      return this.monthlyEmi * this.minEmis;
    },

    selectPackage(pkg) {
      this.selectedPackage = pkg;
      if (!pkg.allowed_tenures.includes(this.selectedTenure)) {
        this.selectedTenure = pkg.allowed_tenures[0];
      }
      // Scroll to calculator
      const calcEl = document.getElementById("emi-calculator-section");
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: "smooth" });
      }
    },

    initTilt() {
      if (window.VanillaTilt) {
        const cards = document.querySelectorAll(".package-tilt-card");
        window.VanillaTilt.init(cards, {
          max: 15,
          perspective: 1000,
          speed: 400,
          glare: true,
          "max-glare": 0.35,
          scale: 1.02
        });
      }
    }
  };
}

window.landingApp = landingApp;
