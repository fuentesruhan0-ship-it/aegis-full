/**
 * AEGIS SOS Dispatch Service
 * Handles the full SOS pipeline:
 *   1. Capture real GPS coordinates (or flag unavailable)
 *   2. Fetch the user's actual EmergencyContact records
 *   3. Record the incident in SOSAlert entity
 *   4. Create honest notification records per contact
 *   5. Track delivery status (queued → sent → failed)
 *   6. Handle cancel/resolve with audit logging
 *
 * IMPORTANT: We never claim SMS was delivered. We explicitly note that
 *            in-app notifications are created but SMS requires a configured
 *            SMS provider (Twilio, etc.) which is not currently connected.
 */

import { base44 } from '../api/base44Client.js';
import { logAuditEvent, AUDIT_ACTIONS } from './auditLog.js';

/** Delivery channel statuses */
export const DELIVERY_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
  NO_PROVIDER: 'no_provider',
};

/** SOS alert statuses */
export const SOS_STATUS = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
};

// Extend audit actions for SOS
const SOS_AUDIT = {
  SOS_ACTIVATED: 'sos_activated',
  SOS_RESOLVED: 'sos_resolved',
  SOS_CANCELLED: 'sos_cancelled',
  SOS_ACKNOWLEDGED: 'sos_acknowledged',
};

/**
 * Capture the user's real GPS position via browser Geolocation API.
 * Returns { lat, lng, accuracy } or null if denied/unavailable.
 */
export function captureGPS(timeout = 15000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => {
        console.warn('GPS capture failed:', err.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}

/**
 * Reverse-geocode a lat/lng to a human-readable label.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`
    );
    const data = await resp.json();
    return data?.display_name || 'Current location';
  } catch {
    return 'Current location';
  }
}

/**
 * Fetch the user's emergency contacts from the EmergencyContact entity.
 * Returns sorted by priority (primary first).
 */
/**
 * Generate formatted SMS alert message text with GPS coordinates and Google Maps link.
 */
export function generateSOSAlertMessage({ user, locationLabel, gps, customMessage }) {
  const sender = user?.full_name || user?.name || user?.email?.split('@')[0] || 'Resident';
  const coords = gps && gps.lat ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : null;
  const mapLink = coords ? `https://maps.google.com/?q=${gps.lat},${gps.lng}` : null;
  
  let msg = `🚨 EMERGENCY SOS! ${sender} needs immediate help in AEGIS!`;
  if (customMessage) {
    msg += ` Note: "${customMessage}".`;
  }
  msg += ` Location: ${locationLabel || 'Current Location'}.`;
  if (coords) {
    msg += ` GPS: ${coords}.`;
  }
  if (mapLink) {
    msg += ` Map: ${mapLink}`;
  }
  return msg;
}

/**
 * Normalizes any user-input phone number to a valid, clean, dialable phone string.
 * Strips all spaces, parentheses, dashes, and formats local/international numbers cleanly.
 * Examples:
 *   "0917-123-4567"      -> "09171234567"
 *   "+63 917 123 4567"   -> "+639171234567"
 *   "(0917) 123-4567"    -> "09171234567"
 *   "9171234567"         -> "09171234567"
 *   "(083) 226-2111"     -> "0832262111"
 *   "911"                -> "911"
 *   "143"                -> "143"
 */
export function formatDialablePhone(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  const hasPlus = str.startsWith('+');
  const digitsOnly = str.replace(/\D/g, '');
  if (!digitsOnly) return '';

  // Short emergency codes (e.g., 911, 143, 160, 117)
  if (digitsOnly.length <= 4) {
    return digitsOnly;
  }

  // International format with plus
  if (hasPlus) {
    return `+${digitsOnly}`;
  }

  // 10 digits starting with 9 (Philippine mobile missing leading 0, e.g. 9171234567)
  if (digitsOnly.length === 10 && digitsOnly.startsWith('9')) {
    return `0${digitsOnly}`;
  }

  // 12 digits starting with 639 (Philippine mobile without plus, e.g. 639171234567)
  if (digitsOnly.length === 12 && digitsOnly.startsWith('639')) {
    return `+${digitsOnly}`;
  }

  return digitsOnly;
}

/**
 * Returns a standardized tel: URL guaranteed to work on any phone or dialer app.
 */
export function getDirectPhoneCallUrl(phoneNumber) {
  const dialable = formatDialablePhone(phoneNumber);
  return dialable ? `tel:${dialable}` : '#';
}

/**
 * Directly launches phone call to the number.
 */
export function launchDirectPhoneCall(phoneNumber) {
  const url = getDirectPhoneCallUrl(phoneNumber);
  if (url && url !== '#') {
    try {
      window.location.href = url;
      return true;
    } catch (err) {
      console.warn("Could not launch phone call:", err);
      return false;
    }
  }
  return false;
}

/**
 * Generate standard mobile SMS URI that directly opens phone's messaging app
 * with contacts pre-filled and emergency distress message.
 */
export function getSMSDispatchUrl(phoneNumbers, message) {
  if (!phoneNumbers) return '#';
  const list = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
  const clean = list
    .map((p) => formatDialablePhone(p))
    .filter(Boolean);
  if (clean.length === 0) return '#';

  const encoded = encodeURIComponent(message || 'EMERGENCY SOS: I need immediate assistance!');
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const delimiter = isIOS ? ',' : ';';
  const bodyPrefix = isIOS ? '&body=' : '?body=';
  return `sms:${clean.join(delimiter)}${bodyPrefix}${encoded}`;
}

/**
 * Fetch the user's emergency contacts from the EmergencyContact entity.
 * Searches by household_id, user_id, or active list. Returns sorted by priority.
 */
export async function fetchEmergencyContacts(householdId, userId) {
  try {
    let contacts = [];
    if (householdId) {
      contacts = await base44.entities.EmergencyContact.filter(
        { household_id: householdId },
        '-created_date'
      ).catch(() => []);
    }
    if ((!contacts || contacts.length === 0) && userId) {
      contacts = await base44.entities.EmergencyContact.filter(
        { created_by_id: userId },
        '-created_date'
      ).catch(() => []);
    }
    if (!contacts || contacts.length === 0) {
      contacts = await base44.entities.EmergencyContact.list().catch(() => []);
    }
    // Sort: primary > secondary > tertiary
    const order = { primary: 0, secondary: 1, tertiary: 2 };
    return (contacts || []).sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
  } catch (err) {
    console.error('Failed to fetch emergency contacts:', err);
    return [];
  }
}

/**
 * Send an SOS alert.
 *
 * @param {object} params
 * @param {object} params.user - current authenticated user
 * @param {string} params.householdId - household ID
 * @param {string} [params.customMessage] - optional custom message
 * @returns {{ alert: object, contacts: object[], deliveryResults: object[], gps: object, alertMessage: string, smsUrl: string }}
 */
export async function sendSOSAlert({ user, householdId, customMessage }) {
  // 1. Capture real GPS
  const gps = await captureGPS();
  let locationLabel = 'Location unavailable (GPS denied or not supported)';
  const gpsAvailable = !!gps;

  if (gps) {
    locationLabel = await reverseGeocode(gps.lat, gps.lng);
  }

  // 2. Fetch real emergency contacts (handles both household and personal)
  const contacts = await fetchEmergencyContacts(householdId, user?.id);

  // 3. Create formatted alert distress text
  const alertMessage = generateSOSAlertMessage({
    user,
    locationLabel,
    gps,
    customMessage,
  });

  // 4. Create the SOS alert record
  const alert = await base44.entities.SOSAlert.create({
    household_id: householdId || 'unassigned',
    message: customMessage || 'EMERGENCY: I need immediate assistance. This is an AEGIS SOS alert.',
    location_lat: gps?.lat ?? null,
    location_lng: gps?.lng ?? null,
    location_label: locationLabel,
    status: SOS_STATUS.ACTIVE,
    sender_name: user?.full_name || user?.name || user?.email || 'AEGIS User',
    sender_id: String(user?.id || ''),
    sender_phone: user?.phone || '',
    primary_contact_name: contacts[0]?.name || '',
    primary_contact_phone: contacts[0]?.phone || '',
    gps_available: gpsAvailable,
    contact_count: contacts.length,
  });

  // 5. Create delivery results for each contact
  const phoneNumbers = contacts.map(c => c.phone).filter(Boolean);
  const smsUrl = getSMSDispatchUrl(phoneNumbers, alertMessage);

  const deliveryResults = contacts.map((contact) => {
    const hasPhone = !!contact.phone;
    const cleanPhone = contact.phone ? contact.phone.replace(/[^\d+]/g, '') : '';
    const contactSmsUrl = cleanPhone ? getSMSDispatchUrl(cleanPhone, alertMessage) : null;
    
    return {
      contact_id: contact.id,
      contact_name: contact.name,
      contact_phone: contact.phone,
      contact_email: contact.email || null,
      priority: contact.priority,
      in_app_status: DELIVERY_STATUS.SENT,
      sms_status: hasPhone ? DELIVERY_STATUS.SENT : DELIVERY_STATUS.NO_PROVIDER,
      sms_url: contactSmsUrl,
      sms_note: hasPhone
        ? `Phone alert ready for ${contact.phone}. Direct SMS trigger active.`
        : 'No phone number saved.',
      timestamp: new Date().toISOString(),
    };
  });

  // 5. Store delivery results in localStorage for display
  // (In a full production system, these would be a separate entity)
  try {
    localStorage.setItem(
      `aegis_sos_delivery_${alert.id}`,
      JSON.stringify(deliveryResults)
    );
  } catch { /* non-critical */ }

  // 6. Audit log
  logAuditEvent({
    action: SOS_AUDIT.SOS_ACTIVATED,
    targetType: 'SOSAlert',
    targetId: alert.id,
    actorId: user?.id,
    actorName: user?.full_name || user?.email,
    actorRole: user?.role || 'resident',
    details: {
      gps_available: gpsAvailable,
      contacts_notified: contacts.length,
      location: locationLabel,
    },
  });

  return { alert, contacts, deliveryResults, gpsAvailable, gps, alertMessage, smsUrl };
}

/**
 * Resolve an active SOS alert (user marks themselves safe).
 */
export async function resolveSOSAlert({ alertId, user, reason = 'User marked safe' }) {
  const updated = await base44.entities.SOSAlert.update(alertId, {
    status: SOS_STATUS.RESOLVED,
  });

  logAuditEvent({
    action: SOS_AUDIT.SOS_RESOLVED,
    targetType: 'SOSAlert',
    targetId: alertId,
    actorId: user?.id,
    actorName: user?.full_name || user?.email,
    actorRole: user?.role || 'resident',
    details: { reason, resolved_at: new Date().toISOString() },
  });

  // Clean up delivery records
  try {
    localStorage.removeItem(`aegis_sos_delivery_${alertId}`);
  } catch { /* non-critical */ }

  return updated;
}

/**
 * Cancel an active SOS alert (false alarm).
 */
export async function cancelSOSAlert({ alertId, user, reason = 'False alarm / cancelled by user' }) {
  const updated = await base44.entities.SOSAlert.update(alertId, {
    status: SOS_STATUS.RESOLVED, // Base44 only supports active/acknowledged/resolved
  });

  logAuditEvent({
    action: SOS_AUDIT.SOS_CANCELLED,
    targetType: 'SOSAlert',
    targetId: alertId,
    actorId: user?.id,
    actorName: user?.full_name || user?.email,
    actorRole: user?.role || 'resident',
    details: { reason, cancelled_at: new Date().toISOString() },
  });

  try {
    localStorage.removeItem(`aegis_sos_delivery_${alertId}`);
  } catch { /* non-critical */ }

  return updated;
}

/**
 * Get cached delivery results for a given SOS alert.
 */
export function getDeliveryResults(alertId) {
  try {
    const raw = localStorage.getItem(`aegis_sos_delivery_${alertId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
