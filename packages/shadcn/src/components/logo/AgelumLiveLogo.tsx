import React from "react";
import { DerivedLogo } from "./DerivedLogo";

interface AgelumLiveLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  layout?: "vertical" | "horizontal";
}

export const AgelumLiveLogo: React.FC<AgelumLiveLogoProps> = (props) => {
  return <DerivedLogo secondaryText="live" {...props} />;
};
