// Store the install prompt event
let deferredPrompt: any = null;

// Event listeners for install prompt state
const installPromptListeners: ((canInstall: boolean) => void)[] = [];

export function registerServiceWorker() {
  // Only run on client-side
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);
          })
          .catch((error) => {
            console.log('Service Worker registration failed:', error);
          });
      });

      // Listen for the beforeinstallprompt event
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        console.log('PWA install prompt ready');
        // Notify listeners that install is available
        notifyInstallPromptListeners(true);
      });

      // Listen for successful installation
      window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully');
        deferredPrompt = null;
        notifyInstallPromptListeners(false);
      });
    }
  } catch (error) {
    console.error('Error in service worker registration:', error);
  }
}

export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

export async function installPWA(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('No install prompt available');
    return false;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);

  // Clear the deferred prompt
  deferredPrompt = null;
  notifyInstallPromptListeners(false);

  return outcome === 'accepted';
}

export function onInstallPromptChange(callback: (canInstall: boolean) => void) {
  installPromptListeners.push(callback);
  // Immediately call with current state
  callback(canInstallPWA());

  // Return cleanup function
  return () => {
    const index = installPromptListeners.indexOf(callback);
    if (index > -1) {
      installPromptListeners.splice(index, 1);
    }
  };
}

function notifyInstallPromptListeners(canInstall: boolean) {
  installPromptListeners.forEach(listener => listener(canInstall));
}
