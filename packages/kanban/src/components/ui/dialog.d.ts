import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

declare const Dialog: typeof DialogPrimitive.Root;
declare const DialogTrigger: typeof DialogPrimitive.Trigger;
declare const DialogPortal: typeof DialogPrimitive.Portal;
declare const DialogClose: typeof DialogPrimitive.Close;

declare const DialogOverlay: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> &
    React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Overlay>>
>;

declare const DialogContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Content>>
>;

declare const DialogHeader: (
  props: React.HTMLAttributes<HTMLDivElement>,
) => JSX.Element;
declare const DialogFooter: (
  props: React.HTMLAttributes<HTMLDivElement>,
) => JSX.Element;

declare const DialogTitle: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> &
    React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Title>>
>;

declare const DialogDescription: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> &
    React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Description>>
>;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
