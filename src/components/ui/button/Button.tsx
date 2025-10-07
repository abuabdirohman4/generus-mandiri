import React, { ReactNode } from "react";
import Spinner from "@/components/ui/spinner/Spinner";

interface ButtonProps {
  children: ReactNode; // Button text or content
  size?: "xs" | "sm" | "md"; // Button size
  variant?: "primary" | "outline" | "plain"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: () => void; // Click handler
  disabled?: boolean; // Disabled state
  loading?: boolean; // Loading state
  loadingText?: string; // Text to show when loading
  className?: string; // Additional CSS classes
  type?: "button" | "submit" | "reset"; // Button type
  formAction?: (formData: FormData) => Promise<never>; // Form action
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  loading = false,
  loadingText,
  type = "button",
  formAction,
}) => {
  // Size Classes
  const sizeClasses = {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-md",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    plain: "",
  };

  // Determine if button should be disabled
  const isDisabled = disabled || loading;

  // Determine spinner color based on variant
  const getSpinnerColor = () => {
    switch (variant) {
      case "primary":
        return "border-white";
      case "outline":
        return "border-gray-700 dark:border-gray-300";
      case "plain":
        return "border-gray-700 dark:border-gray-300";
      default:
        return "border-white";
    }
  };

  return (
    <button
      type={type}
      formAction={formAction}
      className={`inline-flex items-center justify-center font-medium gap-2 rounded-lg transition ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        isDisabled ? "cursor-not-allowed" : ""
      } ${className}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {loading ? (
        <>
          <Spinner size={16} colorClass={getSpinnerColor()} />
          <span className={!loadingText ? "hidden" : ""}>{loadingText}</span>
        </>
      ) : (
        <>
          {startIcon ? <span className="flex items-center">{startIcon}</span> : null}
          {children}
          {endIcon ? <span className="flex items-center">{endIcon}</span> : null}
        </>
      )}
    </button>
  );
};

export default Button;
