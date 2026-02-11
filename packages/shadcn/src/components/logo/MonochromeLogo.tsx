import React from "react";

interface MonochromeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?: string; // Tailwind color class, e.g., 'text-primary', 'text-foreground'
}

const sizeClasses = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl",
  xl: "text-8xl",
};

export const MonochromeLogo: React.FC<MonochromeLogoProps> = ({
  className = "",
  size = "md",
  color = "text-foreground", // Default to foreground color
}) => {
  return (
    <div
      className={`${sizeClasses[size]} ${color} font-bold tracking-tight ${className}`}
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      Agelum
    </div>
  );
};
