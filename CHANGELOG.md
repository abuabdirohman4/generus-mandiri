# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2024-12-19

### Added
- **PWA (Progressive Web App) Support**
  - Custom install prompt with better UX for desktop and mobile
  - Splash screen with app logo and loading animation
  - Offline/online indicator for real-time connection status
  - Update notifications for service worker updates
  - PWA hooks for state management (`usePWA`, `useGlobalLoading`)
  - Global loading handler for smooth app transitions
  - Web app manifest with app metadata and shortcuts
  - Service worker with smart caching strategies

### Changed
- **PWA Implementation**
  - Integrated PWA components into main layout
  - Updated middleware to support PWA files (manifest.json, sw.js, workbox-*.js)
  - Optimized PWA configuration for better performance
  - Enhanced mobile and desktop PWA compatibility

### Removed
- **Cleanup**
  - Removed debug PWA components and scripts
  - Cleaned up unused PWA utilities and configurations
  - Removed development-only PWA files
  - Simplified PWA implementation to essential components only

### Technical Details
- **PWA Components**: `src/components/PWA/`
  - `index.tsx` - Main PWA component with install prompt and offline indicator
  - `SplashScreen.tsx` - App startup screen with branding
  - `LoadingHandler.tsx` - Global loading state management
- **PWA Hooks**: `src/hooks/`
  - `usePWA.ts` - PWA state management (installed, online, canInstall, updateAvailable)
  - `useGlobalLoading.ts` - Global loading state management
- **Configuration**: 
  - `next.config.ts` - PWA configuration with next-pwa
  - `public/manifest.json` - Web app manifest
  - `public/sw.js` - Service worker (auto-generated)

### Installation
- PWA can now be installed on desktop (Chrome, Edge, Safari)
- PWA can be installed on mobile (Chrome, Samsung Internet, Safari)
- Install prompt appears automatically after 3 seconds
- Manual install instructions provided for unsupported browsers

### Breaking Changes
- None

### Migration Guide
- No migration required
- PWA features are automatically available
- Existing functionality remains unchanged

---

## [2.1.2] - Previous Version
- Previous features and improvements
