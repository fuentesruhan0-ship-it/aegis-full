import { createClient, getAccessToken } from '@base44/sdk';
import { appParams } from '../lib/app-params.js';
import { mockBase44 } from '../lib/mockAuth.js';

const { appId, functionsVersion, appBaseUrl } = appParams;

// AEGIS uses mockBase44 for all entity operations and local storage persistence.
// In standalone web deployments (like Vercel) and development, mockBase44 ensures
// all entities (UserLocation, Household, SOSAlert, etc.) and public settings function reliably.
const USE_MOCK = import.meta.env?.VITE_USE_REAL_BACKEND === 'true' ? false : true;

// Function to create a fresh client instance
const createBase44Client = () => {
  if (USE_MOCK) {
    return mockBase44;
  }
  
  // Get the current token (might be null after logout)
  const token = getAccessToken();
  
  const realClient = createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    // Keep internal routing on this app, never redirect to the platform builder domain
    appBaseUrl: appBaseUrl && !appBaseUrl.includes('app.base44.com') ? appBaseUrl : ''
  });

  // Ensure entities are always available even if real backend is partially configured
  return new Proxy(realClient, {
    get(target, prop) {
      if (prop === 'entities') {
        return new Proxy(target.entities || {}, {
          get(entTarget, entProp) {
            return entTarget[entProp] || mockBase44.entities[entProp];
          }
        });
      }
      return target[prop] || mockBase44[prop];
    }
  });
};

// Export a proxy that always uses the latest token
/** @type {ReturnType<typeof createBase44Client>} */
export const base44 = /** @type {any} */ (new Proxy({}, {
  get(target, prop) {
    // Create a fresh client for each operation to ensure latest token is used
    const client = createBase44Client();
    return client[prop];
  }
}));
