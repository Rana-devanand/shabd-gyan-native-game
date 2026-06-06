---
name: Linguistic Precision
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#37393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c6cf'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8d9198'
  outline-variant: '#43474e'
  surface-tint: '#aec8ef'
  primary: '#aec8ef'
  on-primary: '#163151'
  primary-container: '#00203f'
  on-primary-container: '#6f89ad'
  inverse-primary: '#466082'
  secondary: '#93d4b7'
  on-secondary: '#003827'
  secondary-container: '#07513b'
  on-secondary-container: '#82c2a6'
  tertiary: '#aac9f2'
  on-tertiary: '#0f3254'
  tertiary-container: '#00203d'
  on-tertiary-container: '#6b89af'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d3e3ff'
  primary-fixed-dim: '#aec8ef'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#2e4869'
  secondary-fixed: '#aef0d2'
  secondary-fixed-dim: '#93d4b7'
  on-secondary-fixed: '#002116'
  on-secondary-fixed-variant: '#07513b'
  tertiary-fixed: '#d2e4ff'
  tertiary-fixed-dim: '#aac9f2'
  on-tertiary-fixed: '#001c37'
  on-tertiary-fixed-variant: '#2a486b'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display-lg:
    fontFamily: Nunito Sans
    fontSize: 48px
    fontWeight: '900'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Nunito Sans
    fontSize: 36px
    fontWeight: '900'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Nunito Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
  title-lg:
    fontFamily: Nunito Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  tile-text:
    fontFamily: Nunito Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  container-max: 1200px
---

## Brand & Style
The design system is engineered for a premium, high-intellect gaming experience. It merges **Modern Minimalism** with **High-Contrast Boldness** to create a focused, distraction-free environment for word puzzles. 

The aesthetic is characterized by a "dark-mode first" philosophy, utilizing a deep, obsidian-like navy to provide maximum visual comfort during long play sessions. The interface relies on geometric precision, sharp layouts, and a vibrant mint accent that acts as a beacon for interactivity and success states. The emotional response is one of calm concentration, punctuated by the high-energy "spark" of the secondary color.

## Colors
The palette is built on extreme contrast to ensure legibility and a "tech-forward" feel. 

- **Primary (#00203F):** Used for all foundational surfaces and background layers.
- **Secondary (#ADEFD1):** The primary action color. Used for interactive elements, highlights, and "ON" states.
- **Tertiary:** A slightly lighter navy used for surface elevation and card backgrounds to maintain depth.
- **Text:** Primary information is always pure white. Secondary information uses a faded mint transparency to maintain a cohesive color temperature without competing for attention.

## Typography
The system uses **Nunito Sans** for its geometric clarity and friendly but professional weight distribution. 

Headlines are oversized and extra-bold to establish a clear hierarchy during game transitions (e.g., Level Complete, Game Over). For game tiles, use the `tile-text` role to ensure characters are centered and highly legible at a glance. All labels should utilize a slight letter-spacing increase to maintain readability against the dark background.

## Layout & Spacing
The layout follows a **fluid grid** model with a focus on central alignment for gameplay elements. 

- **Mobile:** Uses a 4-column grid with 16px margins. Letter tiles should scale to fit the width of the container.
- **Desktop:** Uses a 12-column grid. The main game board is constrained to a max-width of 600px to ensure focus, while statistics and navigation occupy the peripheral columns.
- **Rhythm:** An 8px baseline grid governs all vertical rhythm.

## Elevation & Depth
This design system avoids traditional shadows in favor of **Tonal Layers** and **Subtle Outlines**.

- **Level 0 (Background):** Solid Deep Navy (#00203F).
- **Level 1 (Cards/Tiles):** Surface color is slightly lighter than background or defined by a `1px` border of `rgba(173, 239, 209, 0.15)`.
- **Level 2 (Modals/Overlays):** Heavy backdrop blur (20px) on the background with a clearly defined Mint border.
- **Interactive State:** Elements do not "lift" with shadows; instead, they change stroke weight or background opacity to indicate state.

## Shapes
The shape language is "Hyper-Rounded," creating a friendly contrast against the high-contrast color scheme.

- **Cards:** 16px radius provides a modern, structural feel for content containers.
- **Modals:** 24px radius emphasizes the "overlay" nature and softens the transition.
- **Interactive Elements:** Buttons and Category Chips must be fully pill-shaped (50px) to maximize touch-target perception and distinctiveness.

## Components
- **Buttons:** Primary buttons use a solid Mint Green (#ADEFD1) fill with Deep Navy text. There are no shadows; use a subtle scale-down effect (0.98x) on press.
- **Letter Tiles:** Squares with 8px radius. Default state: Navy background with Mint border. Active/Selected state: Mint background with Navy text.
- **Category Chips:** Pill-shaped. Unselected: Transparent with Mint border. Selected: Solid Mint.
- **Statistic Cards:** Use the 16px card radius with the subtle `rgba(173, 239, 209, 0.15)` border. Large numerical data should be in White, with labels in Faded Mint.
- **Toggles:** Track is Deep Navy with a Mint border. The "ON" thumb and track fill are solid Mint Green.
- **Navigation Bar:** Fixed to the top or bottom with a heavy backdrop blur and a single 1px Mint border on the inner edge.