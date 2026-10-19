import { createClient, getAccessToken } from '@base44/sdk';
import { appParams } from '../lib/app-params.js';
import { mockBase44 } from '../lib/mockAuth.js';

const { appId, functionsVersion, appBaseUrl } = appParams;

const USE_MOCK = !appBaseUrl || !!import.meta.env?.DEV;

// Function to create a fresh client instance
const createBase44Client = () => {
  if (USE_MOCK) {
    return mockBase44;
  }
  
  // Get the current token (might be null after logout)
  const token = getAccessToken();
  
  return createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    // Keep internal routing on this app, never redirect to the platform builder domain
    appBaseUrl: appBaseUrl && !appBaseUrl.includes('app.base44.com') ? appBaseUrl : ''
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
