---
name: Agelum Design System
description: Official design system and UI patterns for Agelum, extracted from ProjectSelector.tsx. Use these patterns for all new UI components to ensure consistency.
---

# Agelum Design System

This skill encapsulates the core design principles, color palettes, and component patterns used in the Agelum interface, specifically modeled after the `ProjectSelector` component. Use this guide when creating or updating UI elements to maintain a cohesive, premium look.

## Core Aesthetic

- **Theme**: Premium Dark Mode with Glassmorphism.
- **Key Concepts**: Translucency, Subtle Glows, Fine Borders, Micro-interactions.
- **Feeling**: Modern, sleek, "alive" (using pulse animations and smooth transitions).

## Color Palette & Utilities

### Backgrounds

- **App Base**: `bg-zinc-950`
- **Overlays/Backdrops**: `bg-black/40 backdrop-blur-sm`
- **Surface (Card/Panel)**:
  - Default: `bg-white/[0.02]`
  - Hover: `bg-white/[0.05]`
  - Active/Selected: `bg-white/[0.06]`
  - Popovers: `bg-zinc-950` with `backdrop-blur-3xl`

### Borders

- **Subtle**: `border-white/[0.04]` or `border-white/[0.05]`
- **Medium**: `border-white/10` or `border-white/[0.08]`
- **Active/Highlight**: `border-white/20`
- **Glass Effect**: `ring-1 ring-white/10` or `ring-1 ring-white/5`

### Typography Colors

- **Primary**: `text-zinc-100` (High emphasis)
- **Secondary**: `text-zinc-400` (Medium emphasis)
- **Tertiary/Meta**: `text-zinc-500`, `text-zinc-600` (Low emphasis)
- **Accents**:
  - **Success/Active**: `text-emerald-400`
  - **Selected**: `text-white`
  - **Hover**: `text-white` (replaces zinc-400/500 on hover)

### Shadows & Glows

- **Card Hover**: `shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]`
- **Inner Depth**: `shadow-inner` (for inputs)
- **White Glow**: `shadow-[0_0_30px_rgba(255,255,255,0.05)]` or `shadow-[0_0_20px_rgba(255,255,255,0.3)]` (stronger)
- **emerald Glow**: `shadow-[0_0_15px_rgba(16,185,129,0.1)]`
- **Ambient Glow**: `bg-white/5 blur-3xl` (absolute positioned circles)

## Typography Styles

- **Font Family**: Default Sans (Inter/Geist implied).
- **Headings**: `text-sm font-bold tracking-tight`
- **Body**: `text-xs` or `text-sm`
- **Captions/Labels**: `text-[10px] uppercase tracking-widest font-bold` or `font-medium`
- **Links/Actions**: `text-xs font-bold text-zinc-400 hover:text-white transition-colors`

## Animation & Transitions

- **Standard Transition**: `transition-all duration-300` or `duration-500` (for smoother feel).
- **Active Pulse**: `animate-pulse` (for status indicators).
- **Interactions**: `group-hover` utilities are heavily used.
- **Active Click**: `active:scale-[0.97]` on interactive cards.

## Component Patterns

### 1. Interactive Cards

Used for projects, list items, selections.

```tsx
<div className="relative group/item">
  <div
    className={cn(
      // Layout & Sizing
      "relative h-[110px] overflow-hidden cursor-pointer",
      // Base Styles
      "rounded-[20px] border border-white/[0.04] bg-white/[0.02]",
      // Transitions
      "transition-all duration-500",
      // Hover Effects
      "hover:bg-white/[0.05] hover:border-white/10 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]",
      // Active/Click Effects
      "active:scale-[0.97]",
      // Selected State
      isSelected &&
        "bg-white/[0.06] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-white/10",
    )}
  >
    <CardContent className="p-4 h-full flex flex-col justify-between">
      {/* Content goes here */}
    </CardContent>

    {/* Optional: Ambient Glow for Selected State */}
    {isSelected && (
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
    )}
  </div>
</div>
```

### 2. Status Badges

Pill-shaped indicators with glows.

```tsx
<div
  className={cn(
    "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors",
    isActive
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
      : "bg-zinc-900 border-zinc-800 text-zinc-600",
  )}
>
  <div
    className={cn(
      "h-1.5 w-1.5 rounded-full",
      isActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-700",
    )}
  />
  <span className="text-[9px] font-black uppercase tracking-widest">
    {isActive ? "Active" : "Idle"}
  </span>
</div>
```

### 3. Glassy Input Fields

Inputs with inner shadow and focus transitions.

```tsx
<div className="relative group">
  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" />
  <Input
    className="pl-11 h-11 bg-white/[0.03] border-white/[0.06] focus-visible:ring-0 focus-visible:border-white/20 transition-all rounded-2xl text-white placeholder:text-zinc-600 shadow-inner"
    placeholder="Search..."
  />
</div>
```

### 4. Icon Containers

Rounded squares with centered icons.

```tsx
<div
  className={cn(
    "h-10 w-10 flex items-center justify-center rounded-[14px] transition-all duration-300",
    isSelected
      ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
      : "bg-white/[0.05] text-zinc-500 group-hover:text-zinc-200 group-hover:bg-white/[0.08]",
  )}
>
  <Icon className="h-5 w-5" />
</div>
```

### 5. Dialog/Popover Content

Modals with high blur and shadow.

```tsx
<PopoverContent className="w-[640px] p-0 border-white/[0.08] bg-zinc-950 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] rounded-[24px] overflow-hidden backdrop-blur-3xl ring-1 ring-white/10 z-50">
  {/* Header with gradient */}
  <div className="p-6 pb-4 flex flex-col gap-4 bg-gradient-to-b from-white/[0.04] to-transparent">
    {/* ... */}
  </div>
</PopoverContent>
```

## Summary Checklist

- [ ] Use `zinc-950` as the base background.
- [ ] Use `white/[0.0X]` for surface layers.
- [ ] Ensure borders are extremely subtle (`white/[0.05]`).
- [ ] Use `backdrop-blur` where appropriate.
- [ ] Add `group-hover` effects for interactivity.
- [ ] Use uppercase `tracking-widest` for small labels.
- [ ] Add subtle `shadow` and `glow` effects for depth.
- [ ] Round corners significantly (`rounded-[20px]`, `rounded-2xl`).
- [ ] Ensure transitions are present (`duration-300` or `500`).
