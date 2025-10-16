import React, { useState } from 'react';
import { EyeIcon, EyeCloseIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error = false,
  hint,
  disabled = false,
  className
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 transition-colors",
            error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500",
            disabled && "opacity-50 cursor-not-allowed",
            "bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400",
            className
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeIcon className="w-5 h-5" />
          ) : (
            <EyeCloseIcon className="w-5 h-5" />
          )}
        </button>
      </div>
      {hint && (
        <p className={cn(
          "text-sm",
          error ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
        )}>
          {hint}
        </p>
      )}
    </div>
  );
}
