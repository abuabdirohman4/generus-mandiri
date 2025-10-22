import { isIOS } from './utils';

export const isInStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

export const canInstallPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Already installed
  if (isInStandaloneMode()) return false;
  
  // iOS can always install via Share menu
  if (isIOS()) return true;
  
  // Other browsers need beforeinstallprompt
  return false; // Will be set to true when event fires
};

export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return { name: 'unknown', isIOS: false };
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOSDevice = isIOS();
  
  let browserName = 'unknown';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    browserName = 'safari';
  } else if (userAgent.includes('chrome')) {
    browserName = 'chrome';
  } else if (userAgent.includes('firefox')) {
    browserName = 'firefox';
  }
  
  return {
    name: browserName,
    isIOS: isIOSDevice,
    userAgent
  };
};
