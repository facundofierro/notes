import React from "react";
import { DerivedLogo } from "./DerivedLogo";

interface AgelumDesignLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const AgelumDesignLogo: React.FC<AgelumDesignLogoProps> = (props) => {
  return <DerivedLogo secondaryText="design" {...props} />;
};
