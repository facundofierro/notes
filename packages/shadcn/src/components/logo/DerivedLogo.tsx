import React from "react";
import { brandColors, statusColors } from "../../lib/theme";

interface DerivedLogoProps {
  secondaryText: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  layout?: "vertical" | "horizontal";
}

const sizeClasses = {
  sm: { agelum: "text-2xl", secondary: "text-lg" },
  md: { agelum: "text-4xl", secondary: "text-2xl" },
  lg: { agelum: "text-6xl", secondary: "text-4xl" },
  xl: { agelum: "text-8xl", secondary: "text-6xl" },
};

export const DerivedLogo: React.FC<DerivedLogoProps> = ({
  secondaryText,
  className = "",
  size = "md",
  layout = "vertical",
}) => {
  const { agelum, secondary } = sizeClasses[size];

  // Determine colors based on secondary text
  const getColors = () => {
    const lowerText = secondaryText.toLowerCase();
    if (lowerText.includes("studio")) {
      return {
        primary: "oklch(0.95 0.02 315.544)", // Very desaturated purple
        secondary: "#71717a", // Tailwind zinc-500
      };
    } else if (lowerText.includes("live")) {
      return {
        primary: "oklch(32.96% 0.071 289.76)", // Desaturated purple like studio
        secondary: statusColors.warning.main, // #f59e0b - yellow
      };
    } else if (lowerText.includes("design")) {
      return {
        primary: "oklch(0.55 0.18 315.544)", // More saturated purple
        secondary: "oklch(0.637 0.237 25.331)", // Orange
      };
    } else if (lowerText.includes("notes")) {
      return {
        primary: "#ffffff", // White Agelum
        secondary: "#fbbf24", // Tailwind yellow-400
      };
    }
    return {
      primary: "oklch(0.65 0.08 315.544)", // Default desaturated purple
      secondary: "oklch(0.6675 0.0835 315.011)", // Default purple
    };
  };

  const colors = getColors();

  const getPrimaryStyle = () => {
    const lowerText = secondaryText.toLowerCase();
    if (lowerText.includes("design")) {
      // Use gradient for design variant
      return {
        background: "linear-gradient(135deg, #6b21a8, #ea580c)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        paddingBottom: "0.1em", // Prevent clipping of descenders
      };
    }
    if (lowerText.includes("live")) {
      // Match hero title gradient and keep transition within 70% of width; thin dark stroke for clarity
      return {
        background:
          "linear-gradient(90deg, #c084fc 0%, #d8b4fe 80%, #facc15 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        // Prevent clipping of descenders (same fix as design)
        paddingBottom: "0.1em",
        display: "inline-block",
        // Very thin dark border
        WebkitTextStroke: "0.20px rgba(15, 23, 42, 0.45)",
        textStroke: "0.20px rgba(15, 23, 42, 0.45)",
      };
    }
    if (lowerText.includes("notes")) {
      return {
        color: "#ffffff",
      };
    }
    return {
      color: colors.primary,
      WebkitTextStroke: `0.5px ${colors.secondary}`,
      textStroke: `0.5px ${colors.secondary}`,
    };
  };

  const getSecondaryStyle = () => {
    const lowerText = secondaryText.toLowerCase();
    if (lowerText.includes("live")) {
      // Solid yellow for "live"
      return {
        color: "#facc15",
        marginTop: undefined,
        // Very thin dark border
        WebkitTextStroke: "0.20px rgba(15, 23, 42, 0.45)",
        textStroke: "0.20px rgba(15, 23, 42, 0.45)",
      };
    }
    if (lowerText.includes("notes")) {
      return {
        color: "#fbbf24",
        fontFamily: "var(--font-caveat), cursive",
        transform: "rotate(-5deg)",
        display: "inline-block",
        fontSize: "1.2em",
        lineHeight: "1",
      };
    }
    return {
      color: colors.secondary,
    };
  };
  const isHorizontal = layout === "horizontal";

  return (
    <div className={`inline-flex relative ${className}`}>
      <div
        className={`flex ${isHorizontal ? "flex-row gap-2 items-baseline" : "flex-col"}`}
      >
        <div
          className={`${agelum} font-bold tracking-tight`}
          style={{
            ...getPrimaryStyle(),
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Agelum
        </div>
        <div
          className={`${secondary} ${isHorizontal ? "" : "text-right"}`}
          style={{
            marginTop: isHorizontal ? "0" : "-0.3em",
            ...getSecondaryStyle(),
          }}
        >
          {secondaryText}
        </div>
      </div>
    </div>
  );
};
