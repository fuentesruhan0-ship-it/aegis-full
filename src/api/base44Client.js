import { createClient, getAccessToken } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { mockBase44 } from '@/lib/mockAuth';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Use mock auth if no backend URL is configured or in development
const USE_MOCK = !appBaseUrl || import.meta.env.DEV;

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
    appBaseUrl
  });
};

// Export a proxy that always uses the latest token
export const base44 = new Proxy({}, {
  get(target, prop) {
    // Create a fresh client for each operation to ensure latest token is used
    const client = createBase44Client();
    return client[prop];
  }
});
