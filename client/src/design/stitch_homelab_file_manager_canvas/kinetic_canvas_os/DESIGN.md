---
name: Kinetic Canvas OS
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#434853'
  on-tertiary: '#ffffff'
  tertiary-container: '#5b606b'
  on-tertiary-container: '#d7dbe8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#dee2ef'
  tertiary-fixed-dim: '#c2c6d3'
  on-tertiary-fixed: '#171c25'
  on-tertiary-fixed-variant: '#424751'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an architectural, gallery-grade personal file management system designed for homelab power users and collectors. The interface rejects cluttered legacy file-tree conventions in favor of a weightless, luminous workspace where media, code, and systems data sit at the center of attention.

### Design Aesthetics & Philosophy
- **Airy Swiss Precision**: Built on absolute clarity, structured negative space, and disciplined 1px geometric divisions.
- **Pure Luminous Surfaces**: Rejects dark-mode panel fragmentation. Depth is rendered via layered, pristine paper-white sheets, translucent frost layers, and ambient shadow dissipation.
- **Tactile Digital Workspace**: Combines desktop-grade density with floating architectural surfaces—anchored by a hovering utility dock, decoupled contextual action bars, and non-intrusive floating inspection panes.
- **Utilitarian Elegance**: Information hierarchy prioritizes immediate cognitive parsing—file types, storage clusters, permissions, and network throughput read instantaneously via calibrated typography and surgical accent placements.

## Colors

The palette is engineered around an uncompromising, bright luminescence. High-contrast neutral ink (#17191C) anchors text over crisp white and silver canvas planes, while electric indigo acts strictly as a focus instrument for system states, selection matrices, and active operations.

### Canvas & Surface Architecture
- **Base Canvas (`#F7F8FA`)**: The global viewport foundation. Neutral, cool, and low-glare.
- **Surface Layer 0 (`#FFFFFF`)**: Primary content cards, floating modals, contextual toolbars, and file grid canvases.
- **Surface Layer 1 (`#F1F3F5`)**: Structural wells, table header rows, dropzones, and resting state input fields.
- **Interactive Hover Surface (`#F5F7FA`)**: Hover state on rows, cells, and file item containers.
- **Structural Separation Border (`#E5E7EB`)**: Precise 1px boundaries dividing panes, floating rails, and sub-grids.

### Accent & Feedback Pipeline
- **Primary Accent (`#4F46E5`)**: Active selection rings, primary action nodes, upload progress bars, and focused breadcrumb nodes.
- **Accent Soft Wash (`#EEF2FF`)**: Selected card fills, hover states over active chips, multi-select selection bounding boxes.
- **Accent Structural Border (`#C7D2FE`)**: Active card stroke, focused input borders, drag-over boundary indicators.

### Typography Ink Roles
- **Primary Ink (`#17191C`)**: High-legibility body, file titles, modal headings, and breadcrumb terminals.
- **Secondary Ink (`#6B7280`)**: Metadata tags, column headers, file paths, and storage telemetry labels.
- **Muted Ink (`#9CA3AF`)**: Non-interactive placeholders, shortcuts, and disabled states.

## Typography

The type system blends the structural, monospaced-adjacent precision of **Geist** for technical indicators, titles, and data metadata with the ultra-smooth paragraph legibility of **Inter** for descriptions and body texts.

- **Numerics & Metadata**: All file sizes, timestamps, checksums, and storage units utilize tabular numeric figures (`font-variant-numeric: tabular-nums`) through `Geist` to ensure vertical column alignment across dense file lists.
- **Hierarchy Enforcers**: `label-sm` enforces an uppercase, micro-tracked presentation for cluster node tags, MIME-type chips, and preview properties.
- **Path & Hierarchy**: Inline breadcrumbs leverage `body-md` in `Geist`, allowing slashes and segments to sit on consistent optical baseline heights.

## Layout & Spacing

The OS adopts a decoupled viewport model: an unrestricted workspace canvas surrounded by floating instrumental panels rather than rigid, edge-to-edge splitters.

### Spatial Arrangement
- **The Core Workspace Canvas**: A fluid grid utilizing a 12-column foundation for dashboard metrics and dynamic CSS grid layouts (`repeat(auto-fill, minmax(160px, 1fr))`) for file cards.
- **Integrated Canvas Navigation**: Breadcrumbs and view switchers sit directly inside the top canvas layer at an offset of `space-lg` (20px), completely detached from any dark global navbar.
- **Floating Operational Dock**: Floats 24px above the bottom viewport center, housing core homelab navigation (Storage Volumes, Network, Docker shares, Settings) inside a compact, frosted white container.
- **Contextual Action Bar**: Emerges at top-center only when files are selected, providing instant access to download, move, share, tag, and terminal actions without obscuring directory contents.
- **Floating Inspector Drawer**: Sits pinned 24px off the right canvas edge with a fixed width of `360px`, elevated over the primary grid to display instant EXIF data, hex dumps, and permission controls.

## Elevation & Depth

Visual hierarchy is generated through layered, ultra-diffused luminous shadows combined with crisp 1px borders. Surfaces feel weightless, precision-milled, and pristine.

### Elevation Levels

- **Base Layer (0dp)**: Canvas base (`#F7F8FA`). No shadow, no outline.
- **Layer 1 (Card & Row Level)**:
  - *Treatment*: `#FFFFFF` surface with `1px solid #E5E7EB`.
  - *Shadow*: `0 1px 2px 0 rgba(23, 25, 28, 0.03)`.
  - *Use Case*: Unselected file grid cards, standard list rows, and telemetry gauges.
- **Layer 2 (Floating Action Bars & Context Panels)**:
  - *Treatment*: `#FFFFFF` with `backdrop-filter: blur(12px)` and `1px solid #E5E7EB`.
  - *Shadow*: `0 4px 16px -2px rgba(23, 25, 28, 0.05), 0 2px 4px -1px rgba(23, 25, 28, 0.03)`.
  - *Use Case*: Bottom dock, top contextual batch-action pill, search suggestion overlays.
- **Layer 3 (Modals, Transfer Center, & Command Palette)**:
  - *Treatment*: Pure `#FFFFFF` surface with `1px solid rgba(229, 231, 235, 0.8)`.
  - *Shadow*: `0 20px 32px -8px rgba(23, 25, 28, 0.08), 0 8px 16px -4px rgba(23, 25, 28, 0.04)`.
  - *Use Case*: Quick-switcher (Cmd+K), multi-item upload transfer queue drawer, media quick-look lightbox.

## Shapes

The interface balances sharp architectural discipline with smooth, modern corner radii:

- **Structural Outer Frames & Modals**: `1rem` (16px / `rounded-lg`) corner radii create unified windowing silhouettes for the command palette, upload modal, and metadata inspector.
- **Cards & File Containers**: `0.5rem` (8px / base roundedness) maintains tight layout geometry in dense multi-column grids.
- **Interactive Elements & Input Fields**: `0.5rem` (8px) for buttons, inputs, and search containers.
- **Floating Docks & Pills**: Full roundedness (`rounded-full` / 9999px) is applied selectively to the floating bottom dock, selection counters, and status badges to clearly distinguish controls from rectangular content objects.

## Components

### Buttons
- **Primary Action**: Solid `#4F46E5` background, `#FFFFFF` text, `0.5rem` corner radius, subtle shadow `0 1px 2px rgba(79, 70, 229, 0.2)`. On hover: `#4338CA`.
- **Secondary Action**: Background `#FFFFFF`, border `1px solid #E5E7EB`, text `#17191C`. On hover: background `#F5F7FA`, border `#D1D5DB`.
- **Ghost Action**: Transparent background, text `#6B7280`. On hover: background `#F1F3F5`, text `#17191C`.
- **Icon Buttons**: Centered 16px icons within a 32x32px or 36x36px frame, `0.5rem` border radius.

### Input Fields & Search Bars
- Resting background `#FFFFFF`, border `1px solid #E5E7EB`, text `#17191C`, placeholder `#9CA3AF`.
- Focus state: border `1px solid #4F46E5`, ring `3px solid #EEF2FF`, smooth 150ms transition.
- Embedded trailing shortcuts: Monospaced badge with `#F1F3F5` background, `#6B7280` text, `4px` radius.

### File & Directory Cards
- Primary resting state: `#FFFFFF` card, `1px solid #E5E7EB`, padding `12px`.
- Hover state: border color softens to `#D1D5DB`, shadow upgrades to `0 4px 12px rgba(23, 25, 28, 0.04)`, background switches to `#F5F7FA`.
- Selected state: background shifts to `#EEF2FF`, border becomes `1px solid #C7D2FE`, with a visible Indigo checkmark in the top-right corner.

### Chips & Meta Tags
- Height: 24px, padding: `0 8px`, border radius: `6px`.
- Default: Background `#F1F3F5`, text `#6B7280`, font size `11px` (`label-sm`).
- Active/Highlight: Background `#EEF2FF`, border `1px solid #C7D2FE`, text `#4F46E5`.

### Checkboxes & Selection Controls
- Checkbox size: 16x16px, border radius `4px`.
- Unchecked: `#FFFFFF` fill, `1px solid #D1D5DB`.
- Checked: `#4F46E5` fill, `#FFFFFF` checkmark icon, no outer stroke.

### Floating Transfer Center
- Anchored at bottom-right viewport (`bottom: 24px`, `right: 24px`), width `340px`.
- Background `#FFFFFF`, elevation Layer 3 shadow, `1px solid #E5E7EB`.
- Shows batch file compression, rsync sync status, and upload bandwidth with high-density tabular progress bars.

### Contextual Action Bar
- Pinned horizontally at top-center, elevation Layer 2 shadow.
- Pill shape (`rounded-full`), white translucent background (`rgba(255, 255, 255, 0.95)` with 8px blur), border `1px solid #E5E7EB`.
- Hosts selection count ("3 items selected") alongside grouped icon buttons for Quick Share, Move to, Archive, and Batch Rename.