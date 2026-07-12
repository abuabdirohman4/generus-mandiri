"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

import LandingPageContent from "./LandingPageContent";

export default function LandingPageClient() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await createAuthClient().auth.getUser();
        setUser(user);
        
        // If user is logged in, redirect to dashboard
        if (user) {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = createAuthClient().auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        // If user is logged in, redirect to dashboard
        if (session?.user) {
          router.push('/dashboard');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is not logged in, show the landing page content
  return <LandingPageContent />;
}
