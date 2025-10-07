export type Language = "en" | "id";

export interface Translations {
  // Navigation
  nav: {
    features: string;
    testimonials: string;
    pricing: string;
    signIn: string;
    getStarted: string;
  };
  
  // Hero Section
  hero: {
    badge: string;
    title: {
      stop: string;
      start: string;
    };
    description: string;
    cta: {
      getStarted: string;
      watchDemo: string;
    };
    stats: {
      users: string;
      productivity: string;
      rating: string;
    };
  };
  
  // Features Section
  features: {
    title: string;
    description: string;
    items: {
      strategicPlanning: {
        title: string;
        description: string;
        features: string[];
      };
      taskManagement: {
        title: string;
        description: string;
        features: string[];
      };
      analytics: {
        title: string;
        description: string;
        features: string[];
      };
      pomodoro: {
        title: string;
        description: string;
        features: string[];
      };
      collaboration: {
        title: string;
        description: string;
        features: string[];
      };
      security: {
        title: string;
        description: string;
        features: string[];
      };
    };
  };
  
  // Benefits Section
  benefits: {
    title: string;
    description: string;
    items: {
      provenResults: {
        title: string;
        description: string;
      };
      simpleIntuitive: {
        title: string;
        description: string;
      };
      worksEverywhere: {
        title: string;
        description: string;
      };
    };
  };
  
  // Testimonials Section
  testimonials: {
    title: string;
    description: string;
    items: {
      sarah: {
        quote: string;
        name: string;
        role: string;
      };
      david: {
        quote: string;
        name: string;
        role: string;
      };
      mike: {
        quote: string;
        name: string;
        role: string;
      };
    };
  };
  
  // CTA Section
  cta: {
    title: string;
    description: string;
    getStarted: string;
    signIn: string;
    disclaimer: string;
  };
  
  // Footer
  footer: {
    description: string;
    product: {
      title: string;
      features: string;
      pricing: string;
      updates: string;
      roadmap: string;
    };
    support: {
      title: string;
      helpCenter: string;
      contactUs: string;
      community: string;
      status: string;
    };
    copyright: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      features: "Features",
      testimonials: "Testimonials",
      pricing: "Pricing",
      signIn: "Sign In",
      getStarted: "Get Started",
    },
    hero: {
      badge: "🚀 Now Available - Transform Your Productivity",
      title: {
        stop: "Stop Planning",
        start: "Start Achieving",
      },
      description: "Better Planner isn't just another task manager—it's your strategic partner in turning dreams into reality. Built with cutting-edge technology and designed for peak performance.",
      cta: {
        getStarted: "Get Started Free",
        watchDemo: "Watch Demo",
      },
      stats: {
        users: "Active Users",
        productivity: "Productivity Increase",
        rating: "User Rating",
      },
    },
    features: {
      title: "Powerful Features That Actually Work",
      description: "Everything you need to plan, execute, and achieve your goals with precision and efficiency.",
      items: {
        strategicPlanning: {
          title: "Strategic Planning",
          description: "13-week quarter system that aligns with your natural productivity cycles. Break down big dreams into achievable 12-week sprints.",
          features: ["Quarter-based mastery", "Vision mapping", "Priority matrix"],
        },
        taskManagement: {
          title: "Smart Task Management",
          description: "Comprehensive task management with priorities, deadlines, and intelligent scheduling that adapts to your workflow.",
          features: ["Drag & drop interface", "Priority management", "Deadline tracking"],
        },
        analytics: {
          title: "Analytics & Insights",
          description: "Real-time progress tracking and intelligent analytics that help you understand your productivity patterns.",
          features: ["Progress visualization", "Performance insights", "Goal tracking"],
        },
        pomodoro: {
          title: "Pomodoro Timer",
          description: "Built-in Pomodoro timer with customizable sessions to maximize your focus and productivity.",
          features: ["Customizable sessions", "Break reminders", "Activity logging"],
        },
        collaboration: {
          title: "Real-time Collaboration",
          description: "Work together seamlessly with live updates, shared workspaces, and team collaboration features.",
          features: ["Live updates", "Shared workspaces", "Team management"],
        },
        security: {
          title: "Enterprise Security",
          description: "Bank-level security with Supabase and Row Level Security to protect your valuable data and privacy.",
          features: ["End-to-end encryption", "Data privacy", "Secure authentication"],
        },
      },
    },
    benefits: {
      title: "Why Choose Better Planner?",
      description: "Join thousands of users who have transformed their productivity and achieved their biggest goals.",
      items: {
        provenResults: {
          title: "Proven Results",
          description: "Users report 40% increase in productivity within the first 2 weeks. See measurable progress toward your goals.",
        },
        simpleIntuitive: {
          title: "Simple & Intuitive",
          description: "No complex setup or learning curve. Start planning and achieving your goals in minutes, not hours.",
        },
        worksEverywhere: {
          title: "Works Everywhere",
          description: "Access your plans on any device, anywhere. Sync seamlessly between your phone, tablet, and computer.",
        },
      },
    },
    testimonials: {
      title: "What Our Users Say",
      description: "Real results from real users who have transformed their productivity with Better Planner.",
      items: {
        sarah: {
          quote: "Finally, a planning tool that actually works! I've tried every productivity app out there, but Better Planner is the only one that stuck. My productivity increased by 40% in just 2 weeks.",
          name: "Sarah M.",
          role: "Entrepreneur",
        },
        david: {
          quote: "The quarter system changed how I think about goals completely. Breaking down big dreams into 12-week sprints makes everything feel achievable. This is game-changing!",
          name: "David L.",
          role: "Consultant",
        },
        mike: {
          quote: "As a software engineer, I appreciate the clean code and performance. But more importantly, it actually helps me stay organized and focused. The Pomodoro timer integration is brilliant.",
          name: "Mike R.",
          role: "Software Engineer",
        },
      },
    },
    cta: {
      title: "Ready to Transform Your Productivity?",
      description: "Join thousands of ambitious individuals who are already achieving their goals with Better Planner. Start your journey today - it's completely free.",
      getStarted: "Get Started Free",
      signIn: "Sign In",
      disclaimer: "No money required • Free • Sign up anytime",
    },
    footer: {
      description: "The ultimate productivity companion for ambitious individuals who refuse to settle for average. Transform your goals into achievements.",
      product: {
        title: "Product",
        features: "Features",
        pricing: "Pricing",
        updates: "Updates",
        roadmap: "Roadmap",
      },
      support: {
        title: "Support",
        helpCenter: "Help Center",
        contactUs: "Contact Us",
        community: "Community",
        status: "Status",
      },
      copyright: "© 2025 Better Planner. All rights reserved. Built with ❤️ for productivity enthusiasts.",
    },
  },
  id: {
    nav: {
      features: "Fitur",
      testimonials: "Testimoni",
      pricing: "Harga",
      signIn: "Sign In",
      getStarted: "Get Started",
    },
    hero: {
      badge: "🚀 Sekarang Tersedia - Transformasi Produktivitas Anda",
      title: {
        stop: "Stop Planning",
        start: "Start Achieving",
      },
      description: "Better Planner bukan hanya manajer tugas biasa—ini adalah mitra strategis Anda dalam mengubah mimpi menjadi kenyataan. Dibangun dengan teknologi canggih dan dirancang untuk performa puncak.",
      cta: {
        getStarted: "Get Started Free",
        watchDemo: "Tonton Demo",
      },
      stats: {
        users: "Pengguna Aktif",
        productivity: "Peningkatan Produktivitas",
        rating: "Rating Pengguna",
      },
    },
    features: {
      title: "Fitur Canggih yang Benar-Benar Berfungsi",
      description: "Semua yang Anda butuhkan untuk merencanakan, mengeksekusi, dan mencapai tujuan Anda dengan presisi dan efisiensi.",
      items: {
        strategicPlanning: {
          title: "Perencanaan Strategis",
          description: "Sistem kuartal 13-minggu yang selaras dengan siklus produktivitas alami Anda. Pecah mimpi besar menjadi sprint 12-minggu yang dapat dicapai.",
          features: ["Mastery berbasis kuartal", "Pemetaan visi", "Matriks prioritas"],
        },
        taskManagement: {
          title: "Manajemen Tugas Cerdas",
          description: "Manajemen tugas komprehensif dengan prioritas, tenggat waktu, dan penjadwalan cerdas yang beradaptasi dengan alur kerja Anda.",
          features: ["Antarmuka drag & drop", "Manajemen prioritas", "Pelacakan tenggat waktu"],
        },
        analytics: {
          title: "Analitik & Wawasan",
          description: "Pelacakan kemajuan real-time dan analitik cerdas yang membantu Anda memahami pola produktivitas Anda.",
          features: ["Visualisasi kemajuan", "Wawasan performa", "Pelacakan tujuan"],
        },
        pomodoro: {
          title: "Timer Pomodoro",
          description: "Timer Pomodoro built-in dengan sesi yang dapat disesuaikan untuk memaksimalkan fokus dan produktivitas Anda.",
          features: ["Sesi yang dapat disesuaikan", "Pengingat istirahat", "Log aktivitas"],
        },
        collaboration: {
          title: "Kolaborasi Real-time",
          description: "Bekerja sama dengan mulus dengan pembaruan langsung, ruang kerja bersama, dan fitur kolaborasi tim.",
          features: ["Pembaruan langsung", "Ruang kerja bersama", "Manajemen tim"],
        },
        security: {
          title: "Keamanan Enterprise",
          description: "Keamanan tingkat bank dengan Supabase dan Row Level Security untuk melindungi data berharga dan privasi Anda.",
          features: ["Enkripsi end-to-end", "Privasi data", "Autentikasi aman"],
        },
      },
    },
    benefits: {
      title: "Mengapa Memilih Better Planner?",
      description: "Bergabunglah dengan ribuan pengguna yang telah mengubah produktivitas mereka dan mencapai tujuan terbesar mereka.",
      items: {
        provenResults: {
          title: "Hasil Terbukti",
          description: "Pengguna melaporkan peningkatan produktivitas 40% dalam 2 minggu pertama. Lihat kemajuan yang terukur menuju tujuan Anda.",
        },
        simpleIntuitive: {
          title: "Sederhana & Intuitif",
          description: "Tidak ada pengaturan rumit atau kurva pembelajaran. Mulai merencanakan dan mencapai tujuan Anda dalam hitungan menit, bukan jam.",
        },
        worksEverywhere: {
          title: "Berfungsi Di Mana Saja",
          description: "Akses rencana Anda di perangkat apa pun, di mana saja. Sinkronkan dengan mulus antara ponsel, tablet, dan komputer Anda.",
        },
      },
    },
    testimonials: {
      title: "Apa Kata Pengguna Kami",
      description: "Hasil nyata dari pengguna nyata yang telah mengubah produktivitas mereka dengan Better Planner.",
      items: {
        sarah: {
          quote: "Akhirnya, alat perencanaan yang benar-benar berfungsi! Saya telah mencoba setiap aplikasi produktivitas di luar sana, tetapi Better Planner adalah satu-satunya yang bertahan. Produktivitas saya meningkat 40% hanya dalam 2 minggu.",
          name: "Sarah M.",
          role: "Pengusaha",
        },
        david: {
          quote: "Sistem kuartal mengubah cara saya berpikir tentang tujuan sepenuhnya. Memecah mimpi besar menjadi sprint 12-minggu membuat semuanya terasa dapat dicapai. Ini mengubah permainan!",
          name: "David L.",
          role: "Konsultan",
        },
        mike: {
          quote: "Sebagai insinyur perangkat lunak, saya menghargai kode yang bersih dan performa. Tetapi yang lebih penting, ini benar-benar membantu saya tetap terorganisir dan fokus. Integrasi timer Pomodoro sangat brilian.",
          name: "Mike R.",
          role: "Insinyur Perangkat Lunak",
        },
      },
    },
    cta: {
      title: "Siap Mengubah Produktivitas Anda?",
      description: "Bergabunglah dengan ribuan individu ambisius yang sudah mencapai tujuan mereka dengan Better Planner. Mulai perjalanan Anda hari ini - sepenuhnya gratis.",
      getStarted: "Mulai Gratis",
      signIn: "Masuk",
      disclaimer: "Tidak perlu uang • Gratis • Sign up kapan saja",
    },
    footer: {
      description: "Mitra produktivitas terbaik untuk individu ambisius yang menolak untuk puas dengan rata-rata. Ubah tujuan Anda menjadi pencapaian.",
      product: {
        title: "Produk",
        features: "Fitur",
        pricing: "Harga",
        updates: "Pembaruan",
        roadmap: "Roadmap",
      },
      support: {
        title: "Dukungan",
        helpCenter: "Pusat Bantuan",
        contactUs: "Hubungi Kami",
        community: "Komunitas",
        status: "Status",
      },
      copyright: "© 2025 Better Planner. All rights reserved. Built with ❤️ for productivity enthusiasts.",
    },
  },
};
