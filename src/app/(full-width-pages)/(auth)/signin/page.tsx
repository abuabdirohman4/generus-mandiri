import { Metadata } from "next";
import Link from "next/link";

import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import SignInForm from "@/components/auth/SignInForm.server";
import Image from "next/image";

export const metadata: Metadata = {
  title: "SignIn Page | Generus Mandiri",
  description: "Sistem Digital Generus LDII Generus Mandiri",
};

export default async function SignIn({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const message = params?.message;
  
  // Check if message is success or error
  const isSuccess = message && (
    message.includes("Account created successfully") ||
    message.includes("Please check your email") ||
    message.includes("successfully")
  );
  
  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      {/* Mobile Header with Gradient Background and Wave Separator */}
      <div className="lg:hidden relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-700 to-brand-800"></div>
        
        {/* Content */}
        <div className="relative z-10 px-6 py-12">
          <div className="flex flex-col items-center max-w-s">
            <Link href="/" className="block mb-4">
              <Image
                width={300}
                height={48}
                src="/images/logo/auth-logo.svg"
                alt="Logo"
              />
            </Link>
            <p className="text-blue-100 text-base">
              Sistem Digital Generus LDII
            </p>
          </div>
        </div>
        
        {/* Wave Shape at Bottom */}
        <div className="absolute bottom-0 left-0 w-full h-12">
          <svg
            viewBox="0 0 1200 120"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0,120 C150,80 300,100 450,90 C600,80 750,100 900,85 C1050,70 1200,90 1200,90 L1200,120 L0,120 Z"
              fill="rgb(249 250 251)"
              className="transition-all duration-300"
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md -mt-16 mx-auto px-6 lg:px-0">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Generus Mandiri
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Masukkan username dan password
          </p>
        </div>

        {/* Main Content Container with Background */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 lg:shadow-none lg:bg-transparent lg:dark:bg-transparent lg:p-0 border md:border-none">
          {/* Mobile: Show subtitle only on mobile since header has title */}
          <div className="lg:hidden mb-6 text-center">
            <p className="text-md text-gray-500 dark:text-gray-400">
              Masukkan username dan password
            </p>
          </div>

          {message ? (
            <div className={`mb-6 p-4 rounded-xl text-center ${
                isSuccess 
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800" 
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
              }`}>
              {message}
            </div>
          ) : null}

          <SignInForm />
        </div>
      </div>

      <div className="lg:hidden relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-700 to-brand-800"></div>
        <div className="relative z-10 px-6 py-12">
          <div className="text-center">
          </div>
        </div>
      </div>
    </div>
  );
} 
