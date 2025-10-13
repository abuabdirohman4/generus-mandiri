"use client";

import { useEffect } from 'react';
import { useUserProfileStore } from '@/stores/userProfileStore';
import { createClient } from '@/lib/supabase/client';
import { clearUserCache } from '@/lib/userUtils';

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
            kelompok_id,
            desa_id,
            daerah_id,
            kelompok:kelompok_id(id, name),
            desa:desa_id(id, name),
            daerah:daerah_id(id, name),
            teacher_classes!teacher_classes_teacher_id_fkey(
              class_id,
              classes:class_id(id, name)
            )
          `)
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          throw profileError;
        }
        
        // Transform teacher_classes to classes array for backward compatibility
        const classes = profileData.teacher_classes?.map((tc: any) => ({
          id: String(tc.classes?.id || ''),
          name: String(tc.classes?.name || '')
        })).filter(Boolean) || [];
        
        // Transform hierarchy objects to ensure proper types
        const kelompokData = Array.isArray(profileData.kelompok) ? profileData.kelompok[0] : profileData.kelompok;
        const desaData = Array.isArray(profileData.desa) ? profileData.desa[0] : profileData.desa;
        const daerahData = Array.isArray(profileData.daerah) ? profileData.daerah[0] : profileData.daerah;
        
        const transformedProfile = {
          ...profileData,
          email: user.email,
          classes: classes,
          kelompok: kelompokData ? {
            id: String(kelompokData.id || ''),
            name: String(kelompokData.name || '')
          } : null,
          desa: desaData ? {
            id: String(desaData.id || ''),
            name: String(desaData.name || '')
          } : null,
          daerah: daerahData ? {
            id: String(daerahData.id || ''),
            name: String(daerahData.name || '')
          } : null
        };
        
        setProfile(transformedProfile);
        
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
          // Clear all user-related cache when signing out
          clearUserCache();
          setProfile(null);
          setLoading(false);
          setError(null);
        } else if (session?.user) {
          fetchUserData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setProfile, setLoading, setError]);

  return <>{children}</>;
}