import React from "react";
import { DerivedLogo } from "./DerivedLogo";

interface AgelumStudioLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  layout?: "vertical" | "horizontal";
}

export const AgelumStudioLogo: React.FC<AgelumStudioLogoProps> = (props) => {
  return <DerivedLogo secondaryText="studio" {...props} />;
};
