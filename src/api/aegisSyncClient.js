// @ts-nocheck
/**
 * AEGIS Cross-Browser Sync Client
 * Ensures that multiple browsers (e.g. Chrome, Edge, Mobile, Incognito)
 * share real-time locations, SOS alerts, and hazard reports on localhost/LAN.
 */

const STORAGE_KEYS = {
  UserLocation: 'mock_user_locations',
  SOSAlert: 'mock_sos_alerts',
  HazardReport: 'mock_hazard_reports',
  SafetyCheckIn: 'mock_safety_checkins',
  Household: 'mock_households',
  EmergencyContact: 'mock_emergency_contacts',
  Announcement: 'mock_announcements',
};

const EVENT_NAMES = {
  UserLocation: 'aegis_location_change',
  SOSAlert: 'aegis_sos_change',
  HazardReport: 'aegis_hazard_change',
  SafetyCheckIn: 'aegis_checkin_change',
  Household: 'aegis_household_change',
  EmergencyContact: 'aegis_contact_change',
};

let sseInitialized = false;
let eventSource = null;

export function getStorageKey(entity) {
  return STORAGE_KEYS[entity] || `mock_${entity.toLowerCase()}s`;
}

export function getEventName(entity) {
  return EVENT_NAMES[entity] || `aegis_${entity.toLowerCase()}_change`;
}

/**
 * Fetch entity items from server store and cache in localStorage.
 */
export async function syncFetch(entity) {
  const key = getStorageKey(entity);
  try {
    const res = await fetch(`/aegis-sync?entity=${encodeURIComponent(entity)}`, {
      cache: 'no-cache',
    });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(items));
        }
        return items;
      }
    }
  } catch {
    // network or offline fallback
  }

  // Fallback to local storage
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Send an update (upsert / create / update / delete) to server store and local storage.
 */
export async function syncPush(entity, action, data, id) {
  const key = getStorageKey(entity);

  // Optimistic update in localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      let localItems = JSON.parse(localStorage.getItem(key) || '[]');
      if (action === 'create' || action === 'upsert') {
        const idx = localItems.findIndex(i => String(i.id) === String(data?.id) || (entity === 'UserLocation' && String(i.created_by_id) === String(data?.created_by_id)));
        if (idx !== -1) {
          localItems[idx] = { ...localItems[idx], ...data, updated_date: new Date().toISOString() };
        } else {
          localItems.unshift({ ...data, updated_date: new Date().toISOString() });
        }
      } else if (action === 'update') {
        const targetId = id || data?.id;
        const idx = localItems.findIndex(i => String(i.id) === String(targetId));
        if (idx !== -1) {
          localItems[idx] = { ...localItems[idx], ...data, updated_date: new Date().toISOString() };
        }
      } else if (action === 'delete') {
        const targetId = id || data?.id;
        localItems = localItems.filter(i => String(i.id) !== String(targetId));
      }
      localStorage.setItem(key, JSON.stringify(localItems));
    } catch {
      // ignore
    }
  }

  // Dispatch local event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(getEventName(entity)));
  }

  // Push to server
  try {
    const res = await fetch('/aegis-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, action, data, id }),
    });
    if (res.ok) {
      const result = await res.json();
      return result.item;
    }
  } catch (err) {
    console.warn('[aegis-sync] Push to server store failed:', err.message);
  }

  return data;
}

/**
 * Connect to Server-Sent Events stream for real-time synchronization.
 */
export function initAegisSSE() {
  if (typeof window === 'undefined' || sseInitialized) return;
  sseInitialized = true;

  function connect() {
    try {
      eventSource = new EventSource('/aegis-sync/stream');

      eventSource.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === 'init' && msg.store) {
            // Hydrate local storage with shared store
            for (const [entity, items] of Object.entries(msg.store)) {
              const key = getStorageKey(entity);
              if (Array.isArray(items) && items.length > 0) {
                localStorage.setItem(key, JSON.stringify(items));
                window.dispatchEvent(new CustomEvent(getEventName(entity)));
              }
            }
          } else if (msg.type === 'entity_changed') {
            const { entity, items } = msg;
            if (entity && Array.isArray(items)) {
              const key = getStorageKey(entity);
              localStorage.setItem(key, JSON.stringify(items));
              window.dispatchEvent(new CustomEvent(getEventName(entity)));
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    } catch {
      setTimeout(connect, 4000);
    }
  }

  connect();

  // Periodic background sync fallback (every 4 seconds) to guarantee sync
  setInterval(() => {
    syncFetch('UserLocation').then(() => {
      window.dispatchEvent(new CustomEvent('aegis_location_change'));
    }).catch(() => {});

    syncFetch('SOSAlert').then(() => {
      window.dispatchEvent(new CustomEvent('aegis_sos_change'));
    }).catch(() => {});

    syncFetch('HazardReport').then(() => {
      window.dispatchEvent(new CustomEvent('aegis_hazard_change'));
    }).catch(() => {});
  }, 4000);
}

// Auto-initialize when imported on client
if (typeof window !== 'undefined') {
  initAegisSSE();
}
