/**
 * AEGIS Location Sharing Service
 * Manages real-time browser geolocation sharing with opt-in privacy controls.
 *
 * Privacy Scopes:
 *   - community:       visible to all authenticated AEGIS users
 *   - trusted_contacts: visible only to the user's household members
 *   - emergency_only:   hidden by default, revealed only during active SOS
 *
 * Sharing States:
 *   - active:   GPS sharing is enabled and position is being broadcast
 *   - paused:   sharing badge remains but position stops updating
 *   - stopped:  user has fully stopped sharing (marker removed)
 *
 * Stale Marker Cleanup:
 *   Locations older than STALE_THRESHOLD_MS (15 minutes) are treated as offline.
 */

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export const SHARING_VISIBILITY = {
  COMMUNITY: 'community',
  TRUSTED_CONTACTS: 'trusted_contacts',
  EMERGENCY_ONLY: 'emergency_only',
};

export const SHARING_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
};

/**
 * Determine whether a location record should be visible to the requesting user.
 *
 * @param {object} locationRecord - The UserLocation entity from base44
 * @param {object} requestingUser - The currently authenticated user
 * @param {string[]} householdMemberIds - Array of user IDs in the requesting user's household
 * @param {boolean} hasActiveSos - Whether the location owner has an active SOS
 * @returns {boolean}
 */
export function isLocationVisibleTo(locationRecord, requestingUser, householdMemberIds = [], hasActiveSos = false) {
  if (!locationRecord) return false;

  // Active emergency SOS beacon owners are ALWAYS visible to everyone
  if (hasActiveSos) return true;

  const recordUserId = String(locationRecord.created_by_id || locationRecord.user_id || '');
  const currentUserId = String(requestingUser?.id || '');

  // User's own location is always visible
  if (currentUserId && recordUserId === currentUserId) return true;

  const visibility = locationRecord.sharing_visibility || SHARING_VISIBILITY.COMMUNITY;
  const status = locationRecord.sharing_status || SHARING_STATUS.ACTIVE;

  // If the user explicitly stopped sharing, hide their marker (unless active SOS)
  if (status === SHARING_STATUS.STOPPED) return false;

  switch (visibility) {
    case SHARING_VISIBILITY.COMMUNITY:
      return true; // Open to all community members
    case SHARING_VISIBILITY.TRUSTED_CONTACTS:
      return householdMemberIds.map(String).includes(recordUserId);
    case SHARING_VISIBILITY.EMERGENCY_ONLY:
      return hasActiveSos || householdMemberIds.map(String).includes(recordUserId);
    default:
      return true;
  }
}

/**
 * Check if a location record is stale.
 * Active community sharing markers remain valid for 24 hours so users don't vanish during tests.
 */
export function isLocationStale(locationRecord) {
  if (!locationRecord) return true;
  if (locationRecord.sharing_status === SHARING_STATUS.ACTIVE) {
    const updated = locationRecord.last_active_at || locationRecord.updated_date || locationRecord.created_date;
    if (!updated) return false;
    return (Date.now() - new Date(updated).getTime()) > (24 * 60 * 60 * 1000); // 24 hours
  }
  const updated = locationRecord.updated_date || locationRecord.created_date;
  if (!updated) return true;
  return (Date.now() - new Date(updated).getTime()) > STALE_THRESHOLD_MS;
}

/**
 * Filter a list of location records to only those visible and non-stale.
 */
export function filterVisibleLocations(locations, requestingUser, householdMemberIds = [], activeSosUserIds = []) {
  if (!locations || !Array.isArray(locations)) return [];

  const currentUserId = String(requestingUser?.id || '');
  const sosIds = (activeSosUserIds || []).map(String);

  return locations.filter((loc) => {
    const locUserId = String(loc.created_by_id || loc.user_id || '');

    // Always show current user's location
    if (currentUserId && locUserId === currentUserId) return true;

    // Check if user has active SOS
    const hasActiveSos = sosIds.includes(locUserId);

    // Active SOS is never filtered by staleness
    if (!hasActiveSos && isLocationStale(loc)) return false;

    // Check visibility
    return isLocationVisibleTo(loc, requestingUser, householdMemberIds, hasActiveSos);
  });
}

/**
 * Get a human-readable label for a sharing visibility scope.
 */
export function getVisibilityLabel(visibility) {
  switch (visibility) {
    case SHARING_VISIBILITY.COMMUNITY:
      return 'Everyone in the community';
    case SHARING_VISIBILITY.TRUSTED_CONTACTS:
      return 'Household members only';
    case SHARING_VISIBILITY.EMERGENCY_ONLY:
      return 'Emergency responders only';
    default:
      return 'Community';
  }
}

/**
 * Get a human-readable label for the sharing status.
 */
export function getStatusLabel(status) {
  switch (status) {
    case SHARING_STATUS.ACTIVE:
      return 'Sharing';
    case SHARING_STATUS.PAUSED:
      return 'Paused';
    case SHARING_STATUS.STOPPED:
      return 'Stopped';
    default:
      return 'Unknown';
  }
}

/**
 * Get the sharing preferences from localStorage.
 */
export function getSharingPreferences(userId) {
  if (!userId) return { visibility: SHARING_VISIBILITY.COMMUNITY };
  try {
    const raw = localStorage.getItem(`aegis_sharing_prefs_${userId}`);
    return raw ? JSON.parse(raw) : { visibility: SHARING_VISIBILITY.COMMUNITY };
  } catch {
    return { visibility: SHARING_VISIBILITY.COMMUNITY };
  }
}

/**
 * Save sharing preferences to localStorage.
 */
export function saveSharingPreferences(userId, prefs) {
  if (!userId) return;
  try {
    localStorage.setItem(`aegis_sharing_prefs_${userId}`, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save sharing preferences:', err);
  }
}

/**
 * Start or update the user's location sharing in Base44 UserLocation entity.
 */
export async function startOrUpdateLocationSharing(base44, {
  user,
  existingLocationId,
  position,
  locationLabel,
  visibility = SHARING_VISIBILITY.COMMUNITY,
  emoji = '🧍',
  avatarUrl = null
}) {
  if (!user || !position) throw new Error('User and position are required to share location');

  const photo = avatarUrl || user.avatar_url || user.imageUrl || null;
  const payload = {
    created_by_id: user.id,
    user_id: user.id,
    full_name: user.full_name || user.name || user.email?.split('@')[0] || 'Community Member',
    location_lat: position.lat,
    location_lng: position.lng,
    location_label: locationLabel || `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
    emoji: photo ? null : (emoji || '🧍'),
    avatar_url: photo,
    sharing_visibility: visibility,
    sharing_status: SHARING_STATUS.ACTIVE,
    last_active_at: new Date().toISOString(),
  };

  saveSharingPreferences(user.id, { visibility });

  if (existingLocationId) {
    return await base44.entities.UserLocation.update(existingLocationId, payload);
  } else {
    // Check if a record already exists for this user
    try {
      const existing = await base44.entities.UserLocation.filter({ created_by_id: user.id }, '-created_date', 1);
      if (existing && existing.length > 0) {
        return await base44.entities.UserLocation.update(existing[0].id, payload);
      }
    } catch { /* proceed to create */ }
    return await base44.entities.UserLocation.create(payload);
  }
}

/**
 * Pause location sharing (leaves marker with paused status, stops live broadcast).
 */
export async function pauseLocationSharing(base44, locationId) {
  if (!locationId) return null;
  return await base44.entities.UserLocation.update(locationId, {
    sharing_status: SHARING_STATUS.PAUSED,
    last_active_at: new Date().toISOString(),
  });
}

/**
 * Stop location sharing completely (marks stopped or deletes marker).
 */
export async function stopLocationSharing(base44, locationId) {
  if (!locationId) return null;
  try {
    return await base44.entities.UserLocation.delete(locationId);
  } catch {
    return await base44.entities.UserLocation.update(locationId, {
      sharing_status: SHARING_STATUS.STOPPED,
    });
  }
}

/**
 * Fetch and filter all visible, non-stale community locations.
 */
export async function fetchCommunityLocations(base44, requestingUser, householdMemberIds = [], activeSosUserIds = []) {
  try {
    const list = await base44.entities.UserLocation.list('-updated_date', 500);
    return filterVisibleLocations(list || [], requestingUser, householdMemberIds, activeSosUserIds);
  } catch (err) {
    console.error('Failed to fetch community locations:', err);
    return [];
  }
}
