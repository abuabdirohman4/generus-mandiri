import { Metadata } from "next";

import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import SignUpForm from "@/components/auth/SignUpForm.server";

export const metadata: Metadata = {
  title: "SignUp Page | Better Planner",
  description: "Create your Better Planner account with name, email and password",
  // other metadata
};

export default async function SignUp({ searchParams }: { searchParams?: Promise<{ message?: string, email?: string }> }) {
  const params = await searchParams;
  const message = params?.message;
  const defaultEmail = params?.email ?? "";
  
  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your information to sign up!
            </p>
          </div>
          {/* <div>
            <GoogleSignInButton />
          </div>
          <div className="relative py-3 sm:py-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                Or
              </span>
            </div>
          </div> */}
          <SignUpForm error={message} defaultEmail={defaultEmail} />
          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Already have an account? {" "}
              <a href="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
