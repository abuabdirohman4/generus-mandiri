import React from "react";

interface SpinnerProps {
  size?: number;
  colorClass?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 32,
  colorClass = "border-brand-600",
  className = ""
}) => (
  <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${colorClass} ${className}`} style={{ width: size, height: size }}></div>
);

export default Spinner; 