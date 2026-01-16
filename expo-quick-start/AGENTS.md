# Agent Guidelines for expo-quick-start

This is an Expo React Native application using file-based routing (expo-router).
It targets iOS, Android, and Web platforms with React 19 and React Native 0.81.

## Skills First

Before starting any task, check whether there is a relevant skill available and apply it. If multiple skills apply, use the minimal set that covers the request and follow their instructions.

## Task Execution Rules

- For every task, first break it into a TODO list.
- Each TODO item is complete only after a check step.
- Minimum check: `npm run lint` must pass.
- For large tasks, `npm run build` must pass after completion.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Start development server (opens interactive menu)
npx expo start

# Platform-specific development
npm run ios          # Start iOS simulator
npm run android      # Start Android emulator
npm run web          # Start web development server

# Linting
npm run lint         # Run ESLint using expo lint

# Reset project (moves starter code to app-example)
npm run reset-project
```

### Testing

This project does not currently have a test framework configured. If tests are added:
- Consider using Jest with `@testing-library/react-native`
- Run single test: `npx jest path/to/file.test.tsx`
- Run tests matching pattern: `npx jest -t "test name pattern"`

## Project Structure

```
app/                    # File-based routes (expo-router)
  _layout.tsx           # Root layout with navigation stack
  +not-found.tsx        # 404 page
  modal.tsx             # Modal screen
  (tabs)/               # Tab navigator group
    _layout.tsx         # Tab bar configuration
    index.tsx           # Home tab
    explore.tsx         # Guide/Explore tab
    photo.tsx           # Photo tab
components/             # Reusable React components
  ui/                   # UI primitives (IconSymbol, Collapsible)
  themed-*.tsx          # Theme-aware components
hooks/                  # Custom React hooks
  use-*.ts              # Hook files (kebab-case)
constants/              # App constants and theme
  theme.ts              # Colors and Fonts
assets/                 # Static assets (images, fonts)
```

## Code Style Guidelines

### File Naming
- **Components**: PascalCase for feature components (`Button.tsx`, `EmojiPicker.tsx`)
- **Themed components**: kebab-case with prefix (`themed-text.tsx`, `themed-view.tsx`)
- **Hooks**: kebab-case with `use-` prefix (`use-theme-color.ts`)
- **Constants**: kebab-case (`theme.ts`)
- **Route files**: kebab-case or index (`index.tsx`, `photo.tsx`)

### Import Order
1. React and React Native imports
2. External library imports (expo-*, react-navigation, etc.)
3. Internal components (`@/components/*`)
4. Internal hooks (`@/hooks/*`)
5. Internal constants (`@/constants/*`)
6. Asset imports (`@/assets/*`)

```typescript
// Example import order
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import Button from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
```

### Path Aliases
Use `@/` alias for absolute imports (configured in tsconfig.json):
```typescript
import { Colors } from '@/constants/theme';  // Good
import { Colors } from '../../constants/theme';  // Avoid
```

### TypeScript
- Strict mode is enabled
- Define prop types inline or with `type` (not `interface` for props)
- Use explicit return types for hooks, implicit for components
- Prefer `type` over `interface` for component props

```typescript
// Prop types
type Props = {
  label: string;
  theme?: 'primary';
  onPress?: () => void;
};

// PropsWithChildren pattern
type Props = PropsWithChildren<{
  isVisible: boolean;
  onClose: () => void;
}>;
```

### Component Patterns
- Use `export default function` for screens/pages
- Use named exports for reusable components
- Place `StyleSheet.create()` at bottom of file
- Use functional components with hooks exclusively

```typescript
// Screen component
export default function HomeScreen() { ... }

// Reusable component
export function ThemedText({ ... }: ThemedTextProps) { ... }
```

### Styling
- Use `StyleSheet.create()` for styles (not inline objects)
- Platform-specific styles with `Platform.select()` or `Platform.OS`
- Theme colors from `@/constants/theme`
- Use `useThemeColor` hook for dynamic theme colors

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
});

// Platform-specific
tabBarStyle: {
  ...(Platform.OS === 'web' ? { height: 64 } : {}),
}
```

### Error Handling
- Use try/catch for async operations
- Log errors with `console.log(e)` for debugging
- Use `alert()` for user-facing messages (simple cases)
- Check for null/undefined before operations

```typescript
try {
  const result = await someAsyncOperation();
  if (result) {
    alert('Success!');
  }
} catch (e) {
  console.log(e);
}
```

### Expo-Specific Patterns
- Use `process.env.EXPO_OS` for platform detection
- Platform-specific files: `component.ios.tsx`, `component.web.ts`
- Use expo-image `Image` component (not react-native Image)
- Use expo-router `Link` for navigation

### State Management
- Use React hooks (`useState`, `useEffect`, `useRef`)
- Prefer local component state
- Use `null` checks and optional chaining
- Explicit type annotations for state

```typescript
const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
const [isVisible, setIsVisible] = useState<boolean>(false);
```

## ESLint Configuration

Uses `eslint-config-expo/flat` with default rules. Run `npm run lint` to check.
Ignored: `dist/*`

## Features and Experiments

Enabled in app.json:
- `typedRoutes`: Type-safe routing with expo-router
- `reactCompiler`: React Compiler for automatic optimizations
- `newArchEnabled`: React Native New Architecture

## Common Tasks

### Adding a New Screen
1. Create file in `app/` directory (file name = route)
2. Export default component function
3. For tabs: add to `app/(tabs)/` and update `_layout.tsx`

### Adding a New Component
1. Create in `components/` (PascalCase for features, kebab-case for themed)
2. Define props type, use StyleSheet for styles
3. Export (default for single-use, named for reusable)

### Theming
- Use `useColorScheme()` for current theme
- Use `useThemeColor()` for themed color values
- Define colors in `constants/theme.ts`
