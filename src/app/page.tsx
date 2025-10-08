import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // If user is logged in, redirect to home
    redirect('/home');
  } else {
    // If user is not logged in, redirect to signin
    redirect('/signin');
  }
}
