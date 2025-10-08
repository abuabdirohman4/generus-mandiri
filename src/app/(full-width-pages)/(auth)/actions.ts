"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { handleApiError, handleAuthError, isRedirectError } from '@/lib/errorUtils';
import { createClient } from "@/lib/supabase/server";
import { isNonEmptyString, isValidEmail } from '@/lib/typeGuards';

export async function login(formData: FormData) {
  const supabase = await createClient();

  // Type-safe form data extraction
  const username = formData.get("username");
  const password = formData.get("password");

  // Validation
  if (!isNonEmptyString(username)) {
    return redirect("/signin?message=Username tidak boleh kosong");
  }

  if (!isNonEmptyString(password)) {
    return redirect("/signin?message=Password tidak boleh kosong");
  }

  // Membuat email dummy dari username
  const email = `${username}@warlob.app`;
  const data = { email, password };

  try {
    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      const errorMessage = handleAuthError(error);
      return redirect(`/signin?message=${encodeURIComponent(errorMessage)}`);
    }

    revalidatePath("/", "layout");
    redirect("/home");
  } catch (error) {
    // Check if this is a Next.js redirect error (expected behavior)
    if (isRedirectError(error)) {
      // Re-throw redirect errors as they are expected
      throw error;
    }
    
    // Handle actual errors
    const errorInfo = handleApiError(error, 'autentikasi', 'gagal login');
    return redirect(`/signin?message=${encodeURIComponent(errorInfo.message || 'Gagal login')}`);
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  
  // Type-safe form data extraction
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");

  // Validation
  if (!isNonEmptyString(email) || !isValidEmail(email)) {
    return redirect("/signup?message=Email tidak valid");
  }

  if (!isNonEmptyString(password)) {
    return redirect("/signup?message=Password tidak boleh kosong");
  }

  if (!isNonEmptyString(name)) {
    return redirect("/signup?message=Nama tidak boleh kosong");
  }

  const data = {
    email,
    password,
    name,
  };
  
  try {
    const result = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          full_name: data.name,
          name: data.name,
        },
      },
    });

    if (result.error) {
      return redirect(`/signup?message=${encodeURIComponent(result.error.message)}&email=${encodeURIComponent(data.email)}`);
    }

    // Force sign out to ensure user is not automatically signed in
    await supabase.auth.signOut();

    // Check if user needs email confirmation
    if (result.data.user && !result.data.user.email_confirmed_at) {
      // User needs to confirm email
      return redirect(`/signin?message=${encodeURIComponent("Please check your email to confirm your account before signing in.")}&email=${encodeURIComponent(data.email)}`);
    }

    // If email is already confirmed (auto-confirm enabled), redirect to signin with success message
    return redirect(`/signin?message=${encodeURIComponent("Account created successfully! Please sign in with your credentials.")}&email=${encodeURIComponent(data.email)}`);
  } catch (error) {
    // Check if this is a Next.js redirect error (expected behavior)
    if (isRedirectError(error)) {
      // Re-throw redirect errors as they are expected
      throw error;
    }
    
    // Handle actual errors
    const errorInfo = handleApiError(error, 'autentikasi', 'gagal membuat akun');
    return redirect(`/signup?message=${encodeURIComponent(errorInfo.message || 'Gagal membuat akun')}&email=${encodeURIComponent(data.email)}`);
  }
}

export async function signOut() {
  const supabase = await createClient();
  
  try {
    await supabase.auth.signOut();
    redirect("/signin");
  } catch (error) {
    // Check if this is a Next.js redirect error (expected behavior)
    if (isRedirectError(error)) {
      // Re-throw redirect errors as they are expected
      throw error;
    }
    
    // Handle actual errors
    const errorInfo = handleApiError(error, 'autentikasi', 'gagal logout');
    console.error('Sign out error:', errorInfo);
    // Even if there's an error, still redirect to signin
    redirect("/signin");
  }
} 