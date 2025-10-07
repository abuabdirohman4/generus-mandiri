import { Metadata } from "next";
import Link from "next/link";

import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import SignInForm from "@/components/auth/SignInForm.server";

export const metadata: Metadata = {
  title: "SignIn Page | Better Planner",
  description: "This is Signin Page Better Planner",
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
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in!
            </p>
          </div>
          {message ? <div className={`mb-4 p-3 rounded text-center ${
              isSuccess 
                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
                : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}>
              {message}
            </div> : null}
          {/* <div>
            <GoogleSignInButton />
          </div> */}
          {/* <div className="relative py-3 sm:py-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                Or
              </span>
            </div>
          </div> */}
          <SignInForm />
          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Don&apos;t have an account? {" "}
              <Link href="/signup" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
