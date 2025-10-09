"use client";

import Link from "next/link";
import { useTransition, useState } from "react";

import { login } from "@/app/(full-width-pages)/(auth)/actions";
import Label from "@/components/form/Label";
import Checkbox from "@/components/form/input/Checkbox";
import Spinner from "@/components/ui/spinner/Spinner";
import { EyeIcon, EyeCloseIcon } from "@/lib/icons";

export default function SignInForm() {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await login(formData);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <Label className="text-gray-700 dark:text-gray-300 font-medium mb-2 block">
          Username<span className="text-red-500 ml-1">*</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <input
            name="username"
            type="text"
            required
            disabled={isPending}
            className="w-full pl-10 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            placeholder="Masukkan username"
          />
        </div>
      </div>
      
      <div>
        <Label className="text-gray-700 dark:text-gray-300 font-medium mb-2 block">
          Password<span className="text-red-500 ml-1">*</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            disabled={isPending}
            className="w-full pl-10 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            placeholder="Masukkan password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeIcon className="w-5 h-5" />
            ) : (
              <EyeCloseIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password - Only show on desktop */}
      {/* <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={keepLoggedIn}
            onChange={setKeepLoggedIn}
            disabled={isPending}
            className="checked:opacity-100"
          />
          <label onClick={() => setKeepLoggedIn(!keepLoggedIn)} htmlFor="keep-logged-in" className="block font-normal text-gray-700 text-theme-sm cursor-pointer dark:text-gray-400">
            Tetap masuk
          </label>
        </div>
        <Link href="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 font-medium">
          Lupa Password?
        </Link>
      </div> */}

      <button 
        type="submit" 
        disabled={isPending}
        className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
      >
        {isPending ? (
          <div className="flex items-center justify-center"> 
            <Spinner size={16} className="mr-2" colorClass="border-white" />
            Masuk...
          </div>
        ) : (
          "Masuk"
        )}
      </button>

      {/* Mobile: Forgot Password Link */}
      {/* <div className="lg:hidden text-center">
        <Link href="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 font-medium">
          Lupa Password?
        </Link>
      </div> */}
    </form>
  );
} 