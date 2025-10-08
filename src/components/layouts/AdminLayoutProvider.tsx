"use client";

import { useEffect } from 'react';
import { useUserProfileStore } from '@/stores/userProfileStore';
import { createClient } from '@/lib/supabase/client';

interface AdminLayoutProviderProps {
  children: React.ReactNode;
}

export function AdminLayoutProvider({ children }: AdminLayoutProviderProps) {
  const { setProfile, setLoading, setError } = useUserProfileStore();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const supabase = createClient();
        
        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw userError;
        }
        
        if (!user) {
          setProfile(null);
          return;
        }
        
        // Get user profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            role,
            classes!classes_teacher_id_fkey (
              id,
              name
            )
          `)
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          throw profileError;
        }
        
        // Add email to profile data
        const profileWithEmail = {
          ...profileData,
          email: user.email
        };
        
        setProfile(profileWithEmail);
        
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        } else if (session?.user) {
          fetchUserData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setProfile, setLoading, setError]);

  return <>{children}</>;
}