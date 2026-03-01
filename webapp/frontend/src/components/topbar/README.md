# TopBar Component

A modern, responsive top navigation bar component built with **Material-UI** and **Tailwind CSS**. Features comprehensive responsive design, dark/light theme support, and professional animations.

## 🚀 Features

- **📱 Fully Responsive**: Seamless adaptation across desktop, tablet, mobile (portrait & landscape)
- **🌙 Dark/Light Mode**: Complete theme integration with smooth transitions
- **🔔 Smart Notifications**: Interactive notification menu with badges and state management
- **👤 User Profile**: Elegant user avatar and profile menu with role-based styling
- **🧭 Dynamic Breadcrumbs**: Context-aware navigation (responsive visibility)
- **✨ Modern Animations**: Hardware-accelerated hover effects and micro-interactions
- **♿ Accessibility**: Full keyboard navigation and screen reader support
- **🎨 Design System**: Integrated with Tailwind design tokens and MUI theme system

## 📖 Usage

### Basic Implementation

```tsx
import { TopBar } from '../components/topbar';

function Layout() {
    const handleMobileMenuToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <div>
            <TopBar onMobileMenuToggle={handleMobileMenuToggle} />
            {/* Rest of your layout */}
        </div>
    );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onMobileMenuToggle` | `() => void` | ✅ | Callback function called when mobile menu button is clicked |

### Dependencies

The component relies on these stores (via React hooks):
- `useAuthStore()` - User authentication state
- `useThemeStore()` - Theme mode management

## 📱 Responsive Behavior

### Desktop (≥1200px)
- Full breadcrumbs with home navigation
- User name and role chip visible
- All action buttons with labels
- Maximized spacing and typography

### Tablet (768px - 1199px)
- Condensed breadcrumbs
- Reduced spacing
- Optimized icon sizes

### Mobile (≤767px)
- Hamburger menu button appears
- User info condensed to avatar only
- Simplified breadcrumbs
- Touch-optimized button sizes

### Small Mobile (≤599px)
- Further reduced elements
- Breadcrumbs condensed/hidden
- Minimal spacing
- Essential actions only

## 🎨 Theme Integration

### Light Mode
- Semi-transparent white background with backdrop blur
- Subtle shadows and borders
- Blue-green gradient accents

### Dark Mode  
- Dark gradient background with enhanced backdrop blur
- Purple-blue accent colors
- Elevated contrast for readability

### Custom Styling

The component uses a hybrid approach:
- **MUI** for base components and theme integration
- **Tailwind** for utility classes and responsive design
- **CSS-in-JS** for dynamic theme-based styling

## 🔧 Components Architecture

```
topbar/
├── TopBar.tsx              # Main component
├── NotificationsMenu.tsx   # Notification dropdown
├── UserProfileMenu.tsx     # User profile dropdown  
├── index.ts               # Exports
├── __tests__/             # Unit tests
│   ├── TopBar.test.tsx
│   ├── NotificationsMenu.test.tsx
│   └── UserProfileMenu.test.tsx
└── __stories__/           # Storybook stories
    └── TopBar.stories.tsx
```

## 🧪 Testing

### Unit Tests
```bash
npm run test src/components/topbar
```

### Visual Testing (Storybook)
```bash
npm run storybook
# Navigate to Components/TopBar
```

### E2E Tests
```bash
npm run test:e2e -- --spec="**/topbar.spec.ts"
```

## 🎯 Test Coverage

- ✅ **Responsive breakpoints** - All screen sizes tested
- ✅ **Theme switching** - Light/dark mode transitions
- ✅ **User interactions** - Clicks, hovers, keyboard navigation
- ✅ **State management** - Notification states, menu open/close
- ✅ **Navigation** - Route changes, breadcrumb clicks
- ✅ **Accessibility** - ARIA attributes, keyboard support
- ✅ **Error states** - Missing user data, network errors

## 🔄 State Management

### Internal State
- Menu open/close states (notifications, user profile)
- Hover states for animations
- Responsive breakpoint detection

### External Dependencies  
- **AuthStore**: User data, authentication status
- **ThemeStore**: Current theme mode, toggle function
- **React Router**: Current route for breadcrumbs

## 🎨 Animations & Interactions

### Entrance Animations
- **Slide Down**: Main AppBar slides from top on mount
- **Fade In**: Individual elements fade in with staggered timing
- **Shimmer Effect**: Animated bottom border on load

### Hover Effects
- **Scale Transform**: Buttons grow slightly on hover (1.05-1.1x)
- **Glow Effects**: Colored shadows on hover
- **Rotation**: Theme toggle rotates 180° on hover
- **Color Transitions**: Smooth background and text color changes

### Mobile Interactions
- **Touch Feedback**: Proper touch states for mobile
- **Gesture Support**: Swipe gestures where applicable
- **Haptic Feedback**: Native feedback on supported devices

## 🚀 Performance Optimizations

- **Hardware Acceleration**: CSS transforms use `transform3d()`
- **Backdrop Blur**: Efficient blur effects with fallbacks
- **Lazy Loading**: Menu content loads only when opened
- **Memoization**: Expensive calculations cached
- **Tree Shaking**: Only import used MUI components

## 🔧 Development Guidelines

### Adding New Features
1. Follow existing responsive patterns
2. Add comprehensive tests (unit + visual + e2e)
3. Update Storybook stories
4. Document in this README

### Styling Conventions
```tsx
// Preferred: Hybrid MUI + Tailwind approach
<IconButton
    className="transition-all duration-300 hover:scale-110"
    sx={{
        bgcolor: mode === 'dark' ? alpha('#fff', 0.05) : alpha('#000', 0.03),
        '&:hover': {
            boxShadow: '0 4px 20px rgba(14, 165, 233, 0.2)',
        },
    }}
>
```

### Responsive Design
```tsx
// Use MUI breakpoints for complex logic
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

// Use Tailwind for simple responsive utilities  
<Typography className="text-sm sm:text-base lg:text-lg">
```

## 🐛 Troubleshooting

### Common Issues

**Notifications not updating?**
- Ensure notification state is properly managed
- Check if API calls are working
- Verify store updates are triggering re-renders

**Responsive layout broken?**
- Check MUI theme breakpoints configuration
- Verify Tailwind CSS is properly configured
- Test on actual devices, not just browser DevTools

**Theme not switching?**
- Confirm `useThemeStore` is properly connected
- Check if CSS variables are updating
- Verify theme provider is wrapping the component

**Animations choppy?**
- Ensure hardware acceleration is enabled
- Check for layout thrashing in large reflows
- Test on lower-end devices

## 📚 Related Components

- `Layout.tsx` - Parent layout component
- `Sidebar` - Navigation sidebar that pairs with TopBar
- `Footer` - Bottom layout component
- `ProtectedRoute` - Route wrapper for authenticated pages

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Add** comprehensive tests for your changes
4. **Update** documentation and Storybook stories
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

---

## 📄 License

This component is part of the Sangfor SCP project. See the project's main LICENSE file for details.

---

## 💡 Need Help?

- **📖 Documentation**: Check the comprehensive manual in `/document/`
- **🐛 Issues**: Report bugs via GitHub Issues  
- **💬 Discussion**: Use GitHub Discussions for questions
- **📧 Contact**: Reach out to the development team

---

*Built with ❤️ by the Sangfor SCP Team*