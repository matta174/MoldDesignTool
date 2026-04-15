# Concrete Brutalist Design Tool — Design System

## Philosophy

Raw. Structural. Honest. The UI mirrors the material: concrete. No decoration for decoration's sake. Every element earns its place. Borders are visible. Grids are exposed. Typography is mechanical. The interface feels like a blueprint pinned to a construction wall.

---

## Color Palette

### Core Grays (Concrete)
| Token              | Hex       | Usage                              |
|--------------------|-----------|-------------------------------------|
| `--concrete-950`   | `#0a0a0a` | Viewport background                |
| `--concrete-900`   | `#141414` | Panel backgrounds                  |
| `--concrete-800`   | `#1e1e1e` | Card / input backgrounds           |
| `--concrete-700`   | `#2a2a2a` | Borders, dividers                  |
| `--concrete-600`   | `#3d3d3d` | Subtle borders, disabled states    |
| `--concrete-400`   | `#6b6b6b` | Secondary text                     |
| `--concrete-300`   | `#8a8a8a` | Placeholder text                   |
| `--concrete-200`   | `#b0b0b0` | Body text                          |
| `--concrete-100`   | `#d4d4d4` | Primary text                       |
| `--concrete-50`    | `#ededed` | Headings, emphasis                 |

### Accent — Formwork Orange
| Token              | Hex       | Usage                              |
|--------------------|-----------|-------------------------------------|
| `--form-500`       | `#e85d26` | Primary actions, active states     |
| `--form-400`       | `#f07a4a` | Hover states                       |
| `--form-600`       | `#c44d1e` | Pressed states                     |
| `--form-100`       | `#fde8de` | Accent text on dark backgrounds    |

### Semantic
| Token              | Hex       | Usage                              |
|--------------------|-----------|-------------------------------------|
| `--danger`         | `#dc2626` | Errors, insufficient draft angle   |
| `--warning`        | `#d97706` | Marginal draft, thin walls         |
| `--success`        | `#16a34a` | Good draft angle, valid geometry   |
| `--info`           | `#2563eb` | Informational highlights           |

### Draft Angle Heatmap
| Token              | Hex       | Usage                              |
|--------------------|-----------|-------------------------------------|
| `--draft-bad`      | `#dc2626` | < 1° draft (unmoldable)            |
| `--draft-marginal` | `#d97706` | 1°–3° draft (risky)               |
| `--draft-good`     | `#16a34a` | > 3° draft (clean release)         |
| `--draft-neutral`  | `#6b6b6b` | Parallel to pull direction         |

---

## Typography

### Font Stack
- **Primary:** `'JetBrains Mono', 'Fira Code', 'SF Mono', monospace`
- **Headings:** `'Space Grotesk', 'Inter', sans-serif` — geometric, industrial
- **Fallback:** System monospace

### Scale
| Token       | Size   | Weight | Line Height | Usage                    |
|-------------|--------|--------|-------------|--------------------------|
| `--text-xs` | 10px   | 400    | 1.4         | Status bar, metadata     |
| `--text-sm` | 12px   | 400    | 1.5         | Labels, panel text       |
| `--text-md` | 14px   | 400    | 1.5         | Body, inputs             |
| `--text-lg` | 16px   | 600    | 1.4         | Panel headings           |
| `--text-xl` | 20px   | 700    | 1.3         | Section titles           |
| `--text-2xl`| 28px   | 800    | 1.2         | Mode labels, hero text   |

### Rules
- ALL CAPS for section headers and mode labels
- Monospace for all numerical values, dimensions, angles
- Letter-spacing: `0.05em` on uppercase text, `0` elsewhere
- No italics. Emphasis through weight or color only.

---

## Spacing & Grid

### Base Unit
`4px` — all spacing is a multiple of 4.

### Spacing Scale
| Token     | Value | Usage                         |
|-----------|-------|-------------------------------|
| `--sp-1`  | 4px   | Tight padding, icon gaps      |
| `--sp-2`  | 8px   | Input padding, small gaps     |
| `--sp-3`  | 12px  | Component padding             |
| `--sp-4`  | 16px  | Panel padding, section gaps   |
| `--sp-6`  | 24px  | Panel section dividers        |
| `--sp-8`  | 32px  | Major layout gaps             |

### Layout Grid
- **Left Panel:** 280px fixed
- **Right Panel:** 320px fixed
- **Viewport:** Fills remaining space (`flex: 1`)
- **Top Toolbar:** 48px fixed height
- **Status Bar:** 32px fixed height
- **Panel sections:** Separated by 1px `--concrete-700` borders

---

## Borders & Surfaces

### Border Style
- **Weight:** 1px solid throughout. No rounded corners. `border-radius: 0` everywhere.
- **Color:** `--concrete-700` default, `--concrete-600` subtle, `--form-500` active/focused
- **Philosophy:** Borders are structural, not decorative. They define space like rebar defines form.

### Surfaces
| Surface          | Background       | Border            |
|------------------|------------------|-------------------|
| Panel            | `--concrete-900` | 1px `--concrete-700` right/left edge |
| Card / Section   | `--concrete-800` | 1px `--concrete-700` all sides       |
| Input            | `--concrete-800` | 1px `--concrete-600`, `--form-500` on focus |
| Viewport         | `--concrete-950` | None              |
| Toolbar          | `--concrete-900` | 1px `--concrete-700` bottom          |
| Status bar       | `--concrete-900` | 1px `--concrete-700` top             |
| Tooltip          | `--concrete-800` | 1px `--concrete-600`                 |

### Shadows
None. Brutalist design rejects artificial depth. Hierarchy comes from borders and background contrast.

---

## Components

### Buttons

**Primary** (actions: Export, Generate Mold)
```
background: --form-500
color: --concrete-950
border: none
padding: 8px 16px
font: --text-sm, uppercase, weight 700, letter-spacing 0.08em
hover: --form-400
active: --form-600
```

**Secondary** (less important actions)
```
background: transparent
color: --concrete-100
border: 1px solid --concrete-600
padding: 8px 16px
hover: border-color --concrete-400
active: background --concrete-800
```

**Ghost** (toolbar items, subtle)
```
background: transparent
color: --concrete-300
border: none
padding: 4px 8px
hover: color --concrete-100, background --concrete-800
active: color --form-500
```

**Icon Button** (toolbar icons)
```
size: 32px × 32px
background: transparent
color: --concrete-300
hover: background --concrete-800, color --concrete-100
active: color --form-500, background --concrete-800
```

### Inputs

**Text / Number Input**
```
background: --concrete-800
border: 1px solid --concrete-600
color: --concrete-100
font: JetBrains Mono, --text-md
padding: 6px 8px
focus: border-color --form-500
placeholder: --concrete-300
```

**Slider**
```
track: --concrete-700, height 2px
thumb: --concrete-100, 12px × 12px square (no border-radius)
active-track: --form-500
```

**Dropdown / Select**
```
Same as text input
Chevron: --concrete-400
Open state: border-color --form-500
Menu: --concrete-800 background, --concrete-700 border
```

### Tabs (Mode Selector)
```
container: border-bottom 1px --concrete-700
inactive tab: color --concrete-400, no border
hover tab: color --concrete-200
active tab: color --form-500, border-bottom 2px --form-500
font: --text-sm, uppercase, weight 600, letter-spacing 0.06em
padding: 8px 16px
```

### Panels

**Section Header**
```
font: Space Grotesk, --text-lg, uppercase, weight 600
color: --concrete-50
letter-spacing: 0.06em
padding-bottom: 8px
border-bottom: 1px solid --concrete-700
margin-bottom: 12px
```

**Property Row** (label + value)
```
display: flex, justify-content: space-between
label: --text-sm, --concrete-400, uppercase
value: --text-sm, JetBrains Mono, --concrete-100
padding: 4px 0
```

**Collapsible Section**
```
header: clickable, chevron left of text
collapsed: chevron rotated -90deg
transition: none (instant, no animation — brutalist)
```

### Validation Badges
```
container: inline-flex, padding 2px 8px
font: --text-xs, uppercase, weight 700
border: 1px solid

error: color --danger, border --danger, background transparent
warning: color --warning, border --warning, background transparent
success: color --success, border --success, background transparent
```

### Tooltip
```
background: --concrete-800
border: 1px solid --concrete-600
color: --concrete-200
font: --text-xs
padding: 4px 8px
delay: 400ms
position: bottom-center, 4px gap
no arrow — just a box
```

---

## Iconography

- **Style:** Outlined, 1.5px stroke, square line-caps
- **Size:** 16px default, 20px for toolbar
- **Library:** Lucide icons (consistent geometric style)
- **Color:** Inherits from parent text color
- **Custom icons** for mold-specific concepts:
  - Mold box (cube with dashed inner shape)
  - Draft angle (triangle with angle arc)
  - Pour hole (cylinder with arrow)
  - Registration key (sphere on corner)

---

## Motion & Transitions

Almost none. Brutalism is immediate.

- **Allowed:** Panel collapse/expand: instant (no easing)
- **Allowed:** Hover state changes: 50ms transition on color/border only
- **Allowed:** 3D viewport camera: smooth orbit (this is functional, not decorative)
- **Forbidden:** Fade-ins, slide-ins, bounce, scale transforms on UI elements
- **Forbidden:** Loading spinners with personality — use a simple pulsing block

---

## Responsive Behavior

This is a desktop-first tool. Minimum viewport: 1280 × 720.

- Below 1280px: Right panel collapses to a bottom drawer
- Below 1024px: Left panel collapses to an overlay
- Mobile: Show a message directing users to desktop ("This tool requires a desktop browser")

---

## Accessibility

- Minimum contrast ratio: 4.5:1 (AA) for all text
- Focus indicators: 2px `--form-500` outline, 2px offset
- Keyboard navigation: All panels, tabs, and controls are focusable
- Screen reader: ARIA labels on all icon-only buttons
- Reduced motion: Respect `prefers-reduced-motion` (already minimal)
