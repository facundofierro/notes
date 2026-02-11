import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const badgeVariants: (
  props?:
    | ({
        variant?:
          | "default"
          | "destructive"
          | "outline"
          | "secondary"
          | "gray"
          | "red"
          | "orange"
          | "amber"
          | "yellow"
          | "lime"
          | "green"
          | "emerald"
          | "teal"
          | "cyan"
          | "sky"
          | "blue"
          | "indigo"
          | "violet"
          | "purple"
          | "fuchsia"
          | "pink"
          | "rose"
          | null
          | undefined;
      } & import("class-variance-authority/types").ClassProp)
    | undefined,
) => string;
export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}
declare function Badge({
  className,
  variant,
  ...props
}: BadgeProps): JSX.Element;
export { Badge, badgeVariants };
