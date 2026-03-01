# UI/UX Modern Enterprise Standards

## 1. Top Navigation Bar (TopBar)
The TopBar serves as the primary navigation and context anchor for the application. It features a blended glass-morphism background and gradient-accented elements.

### 1.1 Visual Design
- **Background**:
  - **Light Mode**: `linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 30%, ...)`
  - **Dark Mode**: `linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(51, 65, 85, 0.95) 30%, ...)`
- **Border**: Bottom border with low opacity.
- **Effects**:
  - **Backdrop Blur**: `blur(20px) saturate(180%)` for a premium glass feel.
  - **Glow**: Subtle bottom glow line using `linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.3), transparent)`.

### 1.2 Title Typography
The TopBar title is the most prominent text element and must match the **Hero Gradient** standard used in page headers.

- **Font Weight**: 700 (Bold)
- **Gradient Fill**:
  - **Dark Mode**: `linear-gradient(135deg, #0ea5e9 0%, #22c55e 50%, #8b5cf6 100%)` (Blue -> Green -> Purple)
  - **Light Mode**: `linear-gradient(135deg, #0284c7 0%, #16a34a 50%, #7c3aed 100%)`

### 1.3 Interactive Elements
- **Buttons**:
  - `IconButton` with `borderRadius: 12px`.
  - Hover effect: Scale (1.1x) + Subtle background highlight.
  - Theme Toggle: Rotates 180deg on hover.
- **Sparkle Icon**: Animated SVG icon next to the title to indicate "Enterprise AI" capabilities.

## 2. Standardized Page Headers
To ensure a consistent, premium executive experience across the platform, all page headers (List and Detail views) must adhere to the following design standards.

### 2.1 Visual Design
The header is designed as a prominent "Hero Section" at the top of the page, featuring a gradient background, glass-morphism effects, and distinct typography.

- **Container**: `Card` component with `borderRadius: 4` (16px).
- **Background**:
  - **Light Mode**: `linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(34, 197, 94, 0.08) 50%, rgba(139, 92, 246, 0.08) 100%)`
  - **Dark Mode**: `linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)`
- **Border**: 2px solid border with low opacity primary color.
- **Effects**:
  - **Shimmer**: A top border shimmer animation (`linear-gradient(90deg, ...)`) to indicate activity.
  - **Floating Icon**: A large (64px) icon box with a drop shadow and a gentle vertical float animation.

### 2.2 content Structure
The header information is organized into two primary lines to satisfy the "2-line" requirement:

1.  **Primary Title (Line 1)**:
    - **Typography**: `h3` (approx 2.5rem), `fontWeight: 900`.
    - **Style**: Gradient text fill (`WebkitBackgroundClip: 'text'`) using the primary branding colors (Blue -> Green -> Purple).
    - **Content**: The main resource name (e.g., "Virtual Machines", "{VM Name}", "{DataStore Name}").

2.  **Navigation & Context (Line 2)**:
    - **Component**: `Breadcrumbs` or a flex row.
    - **Content**: `Home > Section > Current Page`.
    - **Style**: Subtle text color (`text.secondary`), interactive links for parent pages.

### 2.3 Implementation Examples

#### VM Detail Page (`VMDetailPage.tsx`)
```tsx
<Card sx={{ ...gradientStyle }}>
  <Box sx={{ display: 'flex', gap: 3 }}>
    <Box className="floating-icon">
       <VmIcon />
    </Box>
    <Box>
       <Typography variant="h3" className="gradient-text">
          {vm.name}
       </Typography>
       <Breadcrumbs>
          <Link to="/">Home</Link>
          <Link to="/vms">Virtual Machines</Link>
          <Typography>{vm.name}</Typography>
       </Breadcrumbs>
    </Box>
  </Box>
</Card>
```

#### DataStore Detail Page (`DataStoreDetailPage.tsx`)
Follows the exact same pattern, replacing `VmIcon` with `StorageIcon` and the breadcrumb path to `/datastores`.

## 3. Component library
(Future section for Button styles, Card styles, etc.)
