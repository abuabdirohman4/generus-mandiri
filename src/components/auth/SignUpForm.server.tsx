"use client";

import { useTransition, useState } from "react";

import { signup } from "@/app/(full-width-pages)/(auth)/actions";
import Label from "@/components/form/Label";
import Checkbox from "@/components/form/input/Checkbox";
import Spinner from "@/components/ui/spinner/Spinner";
import { EyeIcon, EyeCloseIcon } from "@/lib/icons";

export default function SignUpForm({ error, defaultEmail }: { error?: string | null, defaultEmail?: string }) {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Check if message is success or error
  const isSuccess = error && (
    error.includes("Account created successfully") ||
    error.includes("Please check your email") ||
    error.includes("successfully")
  );

  const validatePasswords = (password: string, confirmPassword: string): boolean => {
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handlePasswordChange = (newPassword: string): void => {
    setPassword(newPassword);
    
    // Always validate when password changes
    if (confirmPassword.length > 0) {
      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match");
        setPasswordSuccess(false);
      } else if (newPassword.length < 6) {
        setPasswordError("Password must be at least 6 characters long");
        setPasswordSuccess(false);
      } else {
        setPasswordError(null);
        setPasswordSuccess(true);
      }
    } else {
      // If confirm password is empty, only check length
      if (newPassword.length > 0 && newPassword.length < 6) {
        setPasswordError("Password must be at least 6 characters long");
        setPasswordSuccess(false);
      } else {
        setPasswordError(null);
        setPasswordSuccess(false);
      }
    }
  };

  const handleConfirmPasswordChange = (newConfirmPassword: string): void => {
    setConfirmPassword(newConfirmPassword);
    if (newConfirmPassword.length > 0) {
      if (password !== newConfirmPassword) {
        setPasswordError("Passwords do not match");
        setPasswordSuccess(false);
      } else if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters long");
        setPasswordSuccess(false);
      } else {
        setPasswordError(null);
        setPasswordSuccess(true);
      }
    } else {
      setPasswordError(null);
      setPasswordSuccess(false);
    }
  };

  const handleSubmit = (formData: FormData): void => {
    if (!validatePasswords(password, confirmPassword)) {
      return;
    }

    startTransition(async () => {
      await signup(formData);
    });
  };

  return (
    <>
      {error ? <div className={`mb-4 p-3 rounded text-center ${
          isSuccess 
            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
            : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
        }`}>
          {error}
        </div> : null}
      <form action={handleSubmit} className="space-y-5">
        <div>
          <Label>Full Name<span className="text-error-500">*</span></Label>
          <input
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isPending}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <Label>Email<span className="text-error-500">*</span></Label>
          <input
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            disabled={isPending}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <Label>Password<span className="text-error-500">*</span></Label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
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
        <div>
          <Label>Confirm Password<span className="text-error-500">*</span></Label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              required
              disabled={isPending}
              className="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isPending}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeIcon className="w-5 h-5" />
              ) : (
                <EyeCloseIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          {passwordError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {passwordError}
            </p>
          )}
          {passwordSuccess && !passwordError && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              ✓ Passwords match
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={agreeToTerms}
            onChange={setAgreeToTerms}
            disabled={isPending}
            className="checked:opacity-100"
          />
          <label onClick={() => setAgreeToTerms(!agreeToTerms)} htmlFor="terms-agree" className="block font-normal text-gray-700 text-theme-sm cursor-pointer  dark:text-gray-400">
            By creating an account you agree to the <button type="button" className="underline text-brand-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded">Terms and Conditions</button> and <button type="button" className="underline text-brand-500 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded">Privacy Policy</button>.
          </label>
        </div>
        <button 
          type="submit" 
          disabled={isPending}
          className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-500"
        >
          {isPending ? (
            <>
              <Spinner size={16} className="mr-2" />
              Creating Account...
            </>
          ) : (
            "Sign Up"
          )}
        </button>
      </form>
    </>
  );
} 