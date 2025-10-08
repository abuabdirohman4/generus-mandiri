"use client";

import { useEffect } from 'react';
import { useUserProfileStore } from '@/stores/userProfileStore';

interface UserProfileProviderProps {
  children: React.ReactNode;
  profile: {
    id: string;
    full_name: string;
    role: string;
    email?: string;
    classes?: Array<{
      id: string;
      name: string;
    }>;
  } | null;
}

export function UserProfileProvider({ children, profile }: UserProfileProviderProps) {
  const setProfile = useUserProfileStore((state) => state.setProfile);

  useEffect(() => {
    if (profile) {
      setProfile(profile);
    }
  }, [profile, setProfile]);

  return <>{children}</>;
}
