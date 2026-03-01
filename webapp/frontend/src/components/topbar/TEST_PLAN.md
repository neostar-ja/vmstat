# TopBar Component Test Plan

This document outlines comprehensive testing strategies for the TopBar component across different testing levels.

## 🧪 Testing Strategy Overview

### Testing Pyramid
- **Unit Tests**: Component logic, state management, props handling
- **Integration Tests**: Component interaction with stores and routing
- **Visual Tests**: Storybook visual regression testing
- **E2E Tests**: End-to-end user workflows
- **Accessibility Tests**: Screen reader and keyboard navigation
- **Performance Tests**: Animation performance and memory usage

## 📋 Test Cases

### Unit Tests (Jest + React Testing Library)

#### ✅ Rendering Tests
- [x] Renders without crashing
- [x] Displays correct page title based on route
- [x] Shows user avatar and information
- [x] Renders notification badge with correct count
- [x] Applies correct theme styles (light/dark)

#### ✅ Responsive Tests  
- [x] Shows mobile menu button on mobile screens
- [x] Hides breadcrumbs on small screens
- [x] Adjusts avatar and button sizes per breakpoint
- [x] User info visibility based on screen size

#### ✅ Interaction Tests
- [x] Mobile menu toggle callback is called
- [x] Theme toggle changes theme mode
- [x] Notification menu opens/closes correctly
- [x] User profile menu opens/closes correctly
- [x] Breadcrumb navigation works

#### ✅ State Management Tests
- [x] Notification state updates correctly
- [x] Menu states (open/closed) managed properly
- [x] Hover states applied and removed
- [x] User data handled gracefully when missing

### Integration Tests

#### Store Integration
```typescript
describe('TopBar Store Integration', () => {
    it('updates when auth store changes', () => {
        // Test user login/logout
    });
    
    it('responds to theme store changes', () => {
        // Test theme switching
    });
    
    it('navigates when router changes', () => {
        // Test route-based title updates
    });
});
```

#### Router Integration
```typescript
describe('TopBar Router Integration', () => {
    it('shows correct breadcrumbs per route', () => {
        // Test different routes
    });
    
    it('navigates on breadcrumb click', () => {
        // Test navigation
    });
});
```

### E2E Tests (Playwright)

#### Desktop Workflows
```typescript
// e2e/topbar-desktop.spec.ts
test.describe('TopBar Desktop', () => {
    test('complete user workflow', async ({ page }) => {
        await page.goto('/');
        
        // Theme switching
        await page.click('[data-testid="theme-toggle"]');
        await expect(page.locator('html')).toHaveClass(/dark/);
        
        // Notifications
        await page.click('[data-testid="notifications-button"]');
        await expect(page.locator('[role="menu"]')).toBeVisible();
        
        // User menu
        await page.click('[data-testid="user-menu-button"]');
        await expect(page.locator('text=โปรไฟล์')).toBeVisible();
        
        // Navigation
        await page.click('text=Virtual Machines');
        await expect(page).toHaveURL('/vms');
        await expect(page.locator('h4')).toHaveText('Virtual Machines');
    });
    
    test('admin user specific features', async ({ page }) => {
        // Login as admin
        await loginAs(page, 'admin');
        await page.goto('/');
        
        // Should see admin menu items
        await page.click('[data-testid="user-menu-button"]');
        await expect(page.locator('text=ผู้ดูแลระบบ')).toBeVisible();
    });
});
```

#### Mobile Workflows  
```typescript
// e2e/topbar-mobile.spec.ts
test.describe('TopBar Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });
    
    test('mobile navigation workflow', async ({ page }) => {
        await page.goto('/');
        
        // Mobile menu should be visible
        await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
        
        // User info should be condensed
        await expect(page.locator('text=John Doe')).not.toBeVisible();
        
        // Theme toggle should work
        await page.click('[data-testid="theme-toggle"]');
        await expect(page.locator('html')).toHaveClass(/dark/);
        
        // Touch interactions
        await page.tap('[data-testid="notifications-button"]');
        await expect(page.locator('[role="menu"]')).toBeVisible();
    });
});
```

#### Tablet Workflows
```typescript  
// e2e/topbar-tablet.spec.ts
test.describe('TopBar Tablet', () => {
    test.use({ viewport: { width: 768, height: 1024 } });
    
    test('tablet layout and interactions', async ({ page }) => {
        await page.goto('/');
        
        // Should show condensed layout
        await expect(page.locator('[data-testid="mobile-menu-toggle"]')).not.toBeVisible();
        await expect(page.locator('text=John Doe')).toBeVisible();
        
        // Portrait to landscape rotation
        await page.setViewportSize({ width: 1024, height: 768 });
        // Test layout adaptation
    });
});
```

### Visual Regression Tests (Storybook + Chromatic)

```typescript
// .storybook/test-runner.ts
import { injectAxe, checkA11y } from 'axe-playwright';

export default {
    async preRender(page) {
        await injectAxe(page);
    },
    
    async postRender(page) {
        // Accessibility testing
        await checkA11y(page, '#root', {
            detailedReport: true,
            detailedReportOptions: { html: true },
        });
        
        // Visual regression
        await page.screenshot({ 
            path: `screenshots/${page.url().split('/').pop()}.png`,
            fullPage: true 
        });
    },
};
```

### Accessibility Tests

```typescript
// __tests__/topbar-accessibility.test.ts
describe('TopBar Accessibility', () => {
    it('has proper ARIA attributes', () => {
        // Test aria-labels, roles, etc.
    });
    
    it('supports keyboard navigation', async () => {
        // Test tab order, enter/space activation
    });
    
    it('works with screen readers', async () => {
        // Test with virtual screen reader
    });
    
    it('meets WCAG AA standards', async () => {
        // Color contrast, text size, etc.
    });
});
```

### Performance Tests

```typescript  
// __tests__/topbar-performance.test.ts
describe('TopBar Performance', () => {
    it('renders within performance budget', () => {
        // Measure render time
    });
    
    it('animates at 60fps', async () => {
        // Measure animation performance
    });
    
    it('handles rapid state changes', () => {
        // Stress test state updates
    });
});
```

## 🔧 Test Setup Requirements

### Dependencies to Add

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@playwright/test": "^1.40.0",
    "@storybook/test-runner": "^0.15.0",
    "@axe-core/playwright": "^4.8.0",
    "axe-playwright": "^1.2.3",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "@vitest/ui": "^1.0.0",
    "@storybook/addon-a11y": "^7.6.0"
  }
}
```

### Test Configuration Files

#### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true,
    },
});
```

#### `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },
    
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Tablet',
            use: { 
                viewport: { width: 768, height: 1024 }
            },
        },
    ],
    
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
```

## 🚀 Running Tests

### Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:visual": "test-storybook",
    "test:a11y": "test-storybook --disable-snapshot-tests"
  }
}
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test TopBar Component

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build-storybook
      - run: npm run test:visual
```

## 📊 Test Coverage Goals

- **Unit Tests**: 95%+ line coverage
- **Integration Tests**: All store and router integrations
- **E2E Tests**: All critical user paths
- **Visual Tests**: All component variants and states
- **Accessibility**: WCAG AA compliance
- **Performance**: <100ms render, 60fps animations

## 🔍 Test Data & Fixtures

### Mock Data
```typescript
// src/test/fixtures/users.ts
export const mockRegularUser = {
    id: 1,
    username: 'john.doe',
    full_name: 'John Doe',
    email: 'john@example.com',
    role: 'user' as const
};

export const mockAdminUser = {
    id: 2,
    username: 'admin',
    full_name: 'Admin User',
    email: 'admin@example.com', 
    role: 'admin' as const
};

export const mockNotifications = [
    {
        id: '1',
        icon: '⚠️',
        title: 'VM-001 CPU สูงกว่า 90%',
        time: '5 นาทีที่แล้ว',
        type: 'warning' as const,
        unread: true
    },
    // ... more notifications
];
```

### Test Utilities
```typescript
// src/test/utils/render.tsx
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';

export const renderWithProviders = (
    ui: React.ReactElement,
    options = {}
) => {
    const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
        return (
            <BrowserRouter>
                <ThemeProvider theme={theme}>
                    {children}
                </ThemeProvider>
            </BrowserRouter>
        );
    };

    return render(ui, { wrapper: AllTheProviders, ...options });
};
```

## ✅ Test Checklist

Before merging TopBar changes, ensure:

- [ ] Unit tests pass with 95%+ coverage
- [ ] All responsive breakpoints tested
- [ ] Light/dark theme variants tested
- [ ] User role variations tested
- [ ] E2E workflows pass on desktop/tablet/mobile
- [ ] Visual regression tests pass
- [ ] Accessibility tests pass (WCAG AA)
- [ ] Performance benchmarks met
- [ ] Storybook stories updated
- [ ] Documentation updated

---

*This test plan ensures the TopBar component meets professional standards for reliability, accessibility, and user experience.*