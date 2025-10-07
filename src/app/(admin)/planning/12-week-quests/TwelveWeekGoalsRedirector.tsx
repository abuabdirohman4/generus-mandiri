"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { getWeekOfYear, getQuarterFromWeek, formatQParam } from "@/lib/quarterUtils";
import { useQuarterStore } from "@/stores/quarterStore";

// Komponen ini adalah client-only redirector untuk halaman 12 Week Quests.
// - Mengecek apakah URL sudah mengandung param ?q=YYYY-Qn.
// - Jika belum, otomatis redirect ke URL dengan param q sesuai quarter saat ini.
// - Bertujuan agar state, localStorage, dan URL selalu sinkron dengan quarter yang dipilih user.
// - Tidak menampilkan UI apapun.

export default function TwelveWeekGoalsRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { year, quarter } = useQuarterStore();
  
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (!qParam) {
      // Use quarter store instead of current date
      const qParamValue = formatQParam(year, quarter);
      router.replace(`/planning/12-week-quests?q=${qParamValue}`);
    } else {
      // Parse URL param and update quarter store if different
      const urlQuarter = parseInt(qParam.split('-Q')[1]);
      const urlYear = parseInt(qParam.split('-Q')[0]);
      
      if (urlQuarter !== quarter || urlYear !== year) {
        useQuarterStore.getState().setQuarter(urlYear, urlQuarter);
      }
    }
  }, [searchParams, router, year, quarter]);

  // Sync URL when quarter store changes
  useEffect(() => {
    const qParam = searchParams.get('q');
    const expectedQParam = formatQParam(year, quarter);
    
    if (qParam !== expectedQParam) {
      router.replace(`/planning/12-week-quests?q=${expectedQParam}`);
    }
  }, [year, quarter, searchParams, router]);
  
  return null;
} 