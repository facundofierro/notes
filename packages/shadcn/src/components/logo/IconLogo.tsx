import React from "react";

interface IconLogoProps {
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

export const IconLogo: React.FC<IconLogoProps> = ({
  className = "",
  size = "md",
  color = "text-primary", // Default to primary color for the icon
}) => {
  return (
    <div
      className={`font-bold ${sizeClasses[size]} ${color} tracking-tight ${className}`}
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      A
    </div>
  );
};
