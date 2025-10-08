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
        <Label>Username<span className="text-error-500">*</span></Label>
        <input
          name="username"
          type="text"
          required
          disabled={isPending}
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Enter your username"
        />
      </div>
      <div>
        <Label>Password<span className="text-error-500">*</span></Label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            disabled={isPending}
            className="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      {/* <div className="flex items-center justify-between">
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
        <Link href="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
          Lupa Password?
        </Link>
      </div> */}
      <button 
        type="submit" 
        disabled={isPending}
        className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-500"
      >
        {isPending ? (
          <>
            <Spinner size={16} className="mr-2" colorClass="border-white" />
            Masuk...
          </>
        ) : (
          "Masuk"
        )}
      </button>
    </form>
  );
} 