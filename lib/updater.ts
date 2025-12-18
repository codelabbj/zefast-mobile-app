import { CapacitorUpdater } from '@capgo/capacitor-updater';

export async function checkForUpdates() {
  try {
    const response = await fetch('https://zefast-mobile-app.vercel.app/releases/manifest.json');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const manifest = await response.json();

    const localVersion = localStorage.getItem('app_version') || '0.0.0';
    if (manifest.android_version !== localVersion) {
      console.log(`New version ${manifest.android_version} found, downloading...`);
      
      const result = await CapacitorUpdater.download({
        url: manifest.apk_url,
        version: manifest.android_version,
      });

      if (result.status === 'success') {
        await CapacitorUpdater.set({ id: result.id });
        localStorage.setItem('app_version', manifest.android_version);
        alert('New version installed! Restarting app...');
        await CapacitorUpdater.reload();
      }
    } else {
      console.log('App is up to date');
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}
