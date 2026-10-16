/**
 * AEGIS Safety & Moderation Utilities
 * Provides:
 * 1. Anti-XSS and HTML text sanitization
 * 2. Sensitive contact information detection and redaction (phone, email)
 * 3. Client-side sliding-window rate limiting per user
 */

/**
 * Basic HTML/XSS sanitization
 * Strips script tags, onload/onerror handlers, and dangerous HTML entities
 */
export function sanitizeText(input = '') {
  if (typeof input !== 'string') return '';

  return input
    // Strip script and iframe tags completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Strip dangerous HTML event attributes (e.g., onload=, onerror=, onclick=)
    .replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '')
    // Neutralize javascript: pseudo-protocols
    .replace(/javascript:/gi, 'blocked-script:')
    // Strip raw HTML tags to prevent broken styling / CSS injection in public cards
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Detect and mask sensitive contact details (Philippine phone numbers, standard emails)
 * Protects residents from accidental personal information leaks in public feeds
 */
export function maskSensitiveInfo(text = '') {
  if (typeof text !== 'string') return { text: '', hadSensitiveInfo: false };

  let clean = text;
  let hadSensitiveInfo = false;

  // Email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  if (emailRegex.test(clean)) {
    hadSensitiveInfo = true;
    clean = clean.replace(emailRegex, '[email hidden for safety]');
  }

  // Philippine Mobile & Landline Regexes (09XX-XXX-XXXX, +639XXXXXXXXX, 09XXXXXXXXX, (083) XXX-XXXX)
  const phoneRegexes = [
    /\b(?:\+63|0)9\d{2}[-\s]?\d{3}[-\s]?\d{4}\b/g,
    /\b\(\d{3,4}\)\s*\d{3}[-\s]?\d{4}\b/g,
    /\b09\d{9}\b/g,
  ];

  phoneRegexes.forEach((regex) => {
    if (regex.test(clean)) {
      hadSensitiveInfo = true;
      clean = clean.replace(regex, '[phone number hidden for safety]');
    }
  });

  return {
    text: clean,
    hadSensitiveInfo,
  };
}

/**
 * Convenience helper returning the redacted text directly
 */
export function redactSensitiveInfo(text = '') {
  return maskSensitiveInfo(text).text;
}

/**
 * Rate Limiting Tracker
 * Enforces cooldown periods and maximum requests per window
 */
const RATE_LIMIT_CONFIGS = {
  comment: { minIntervalMs: 3000, maxPerMinute: 10, label: 'comment' },
  hazard_report: { minIntervalMs: 5000, maxPerMinute: 5, label: 'hazard report' },
  flag: { minIntervalMs: 3000, maxPerMinute: 10, label: 'report' },
  reaction: { minIntervalMs: 500, maxPerMinute: 30, label: 'reaction' },
};

export function checkRateLimit(userId, actionType) {
  if (!userId) return; // Anonymous / bypass
  const config = RATE_LIMIT_CONFIGS[actionType] || { minIntervalMs: 2000, maxPerMinute: 15, label: 'action' };

  const storageKey = `aegis_ratelimit_${userId}_${actionType}`;
  const now = Date.now();
  let timestamps = [];

  try {
    const raw = localStorage.getItem(storageKey);
    timestamps = raw ? JSON.parse(raw) : [];
  } catch {
    timestamps = [];
  }

  // Filter out timestamps older than 60 seconds (1 minute window)
  timestamps = timestamps.filter((t) => now - t < 60000);

  // Check 1: Minimum interval between individual actions (burst protection)
  if (timestamps.length > 0) {
    const lastTimestamp = timestamps[timestamps.length - 1];
    const diff = now - lastTimestamp;
    if (diff < config.minIntervalMs) {
      const waitSec = Math.ceil((config.minIntervalMs - diff) / 1000);
      throw new Error(`Please wait ${waitSec} second${waitSec > 1 ? 's' : ''} before submitting another ${config.label}.`);
    }
  }

  // Check 2: Maximum actions per 1 minute window
  if (timestamps.length >= config.maxPerMinute) {
    throw new Error(`Rate limit exceeded: You have posted too many ${config.label}s in the last minute. Please wait a moment.`);
  }

  // Record this action
  timestamps.push(now);
  try {
    localStorage.setItem(storageKey, JSON.stringify(timestamps));
  } catch (err) {
    console.warn('Failed to persist rate limit timestamp:', err);
  }
}
