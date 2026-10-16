// @ts-nocheck
// Persistent Authentication System with Cryptographic Security
import { generateAIAssistantReply } from './aegisAI.js';

const USERS_DB_KEY = 'aegis_users_db';
const SESSIONS_DB_KEY = 'aegis_sessions_db';

// Precomputed PBKDF2 (SHA-256, 100,000 iterations) credentials for initial and demo accounts
const INITIAL_ACCOUNTS = [
  {
    id: '1',
    email: 'flearjoem@gmail.com',
    passwordHash: '300919ac59644f00eb2465bbd8195ab024f528f5440732e3a488fbd8d914e254', // password123
    salt: 'salt_flearjoem_2026',
    name: 'Test User',
    full_name: 'Test User',
    fullName: 'Test User',
    phone: '09855719264',
    role: 'resident',
    is_demo: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo-user-1',
    email: 'resident.tupi@aegis.ph',
    passwordHash: '2afaf4f640c0d511052c965a0675b5a3e3d7bd4ffe6487856320477ebd0ae6c5', // demo123
    salt: 'salt_demo_resident_2026',
    name: 'Juan Dela Cruz',
    full_name: 'Juan Dela Cruz',
    fullName: 'Juan Dela Cruz',
    phone: '+63 917 123 4567',
    role: 'resident',
    barangay: 'Barangay Poblacion (Center)',
    municipality: 'Tupi',
    province: 'South Cotabato',
    household_id: 'hh-demo-1',
    is_demo: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo-user-2',
    email: 'responder.tupi@aegis.ph',
    passwordHash: '2afaf4f640c0d511052c965a0675b5a3e3d7bd4ffe6487856320477ebd0ae6c5', // demo123
    salt: 'salt_demo_resident_2026',
    name: 'SPO1 Ramon Reyes',
    full_name: 'SPO1 Ramon Reyes',
    fullName: 'SPO1 Ramon Reyes',
    phone: '+63 920 882 1923',
    role: 'responder',
    agency: 'Tupi Emergency Response Team',
    barangay: 'Barangay Crossing Rubber',
    municipality: 'Tupi',
    province: 'South Cotabato',
    household_id: 'hh-demo-1',
    is_demo: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo-user-3',
    email: 'drrmo.officer@tupi.gov.ph',
    passwordHash: '2afaf4f640c0d511052c965a0675b5a3e3d7bd4ffe6487856320477ebd0ae6c5', // demo123
    salt: 'salt_demo_resident_2026',
    name: 'Officer Alcantara',
    full_name: 'Officer Alcantara',
    fullName: 'Officer Alcantara',
    phone: '+63 918 333 4455',
    role: 'drrmo',
    agency: 'MDRRMO Tupi Operations Center',
    barangay: 'Barangay Poblacion (Center)',
    municipality: 'Tupi',
    province: 'South Cotabato',
    household_id: 'hh-demo-1',
    is_demo: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  }
];

// Cryptographic helpers using WebCrypto API
function generateSalt() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function hashPassword(password, salt) {
  try {
    const enc = new TextEncoder();
    let subtle = null;
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
      subtle = globalThis.crypto.subtle;
    } else if (typeof window === 'undefined') {
      try {
        const nodeCrypto = await import(/* @vite-ignore */ 'crypto');
        subtle = nodeCrypto.webcrypto?.subtle;
      } catch {}
    }
    if (subtle) {
      const keyMaterial = await subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const key = await subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      return Array.from(new Uint8Array(key))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (e) {
    console.warn('SubtleCrypto error in hashPassword, using fallback digest:', e);
  }
  // Deterministic fallback for environments without WebCrypto PBKDF2
  let hash = 0;
  const str = salt + ':' + password;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

// Database Helpers for Persistent User Accounts
export function getUsersDB() {
  if (typeof localStorage === 'undefined') return [...INITIAL_ACCOUNTS];
  try {
    const stored = localStorage.getItem(USERS_DB_KEY);
    if (stored) {
      const users = JSON.parse(stored);
      let modified = false;
      // Migrate any existing student accounts to general resident
      for (const u of users) {
        if (u.role === 'student') {
          u.role = 'resident';
          modified = true;
        }
      }
      // Ensure seed demo users exist in the DB so demo buttons always work
      for (const seed of INITIAL_ACCOUNTS) {
        if (!users.some(u => u.email.toLowerCase() === seed.email.toLowerCase())) {
          users.push({ ...seed });
          modified = true;
        }
      }
      if (modified) {
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
      }
      return users;
    }
  } catch (e) {
    console.warn('Error reading users DB:', e);
  }
  // Initialize with seed users
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(INITIAL_ACCOUNTS));
  } catch {}
  return [...INITIAL_ACCOUNTS];
}

export function saveUsersDB(users) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users DB:', e);
    }
  }
}

// Session Management Helpers
export function getSessionsDB() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SESSIONS_DB_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function saveSessionsDB(sessions) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SESSIONS_DB_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save sessions DB:', e);
    }
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

let currentUser = null;

function createSessionForUser(user) {
  const token = 'aegis-token-' + user.id + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const session = {
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days session
  };
  const sessions = getSessionsDB();
  sessions.push(session);
  saveSessionsDB(sessions);

  currentUser = sanitizeUser(user);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('mock_auth_token', token);
    localStorage.setItem('mock_user', JSON.stringify(currentUser));
  }
  return token;
}

export function getActiveUser() {
  if (currentUser) return currentUser;
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('mock_user');
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return null;
}

export const mockAuth = {
  async register({ email, password, phone, role, name }) {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsersDB();

    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please log in or use a different email.');
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const validRoles = ['resident', 'lgu', 'drrmo', 'volunteer', 'responder'];
    const assignedRole = validRoles.includes(role) ? role : 'resident';
    const displayName = (name && name.trim()) || normalizedEmail.split('@')[0];

    const newUser = {
      id: 'usr_' + Date.now() + Math.random().toString(36).substring(2, 6),
      email: normalizedEmail,
      passwordHash,
      salt,
      name: displayName,
      full_name: displayName,
      fullName: displayName,
      phone: phone ? phone.trim() : '',
      role: assignedRole,
      is_demo: false,
      household_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsersDB(users);

    const token = createSessionForUser(newUser);
    return { access_token: token, user: sanitizeUser(newUser) };
  },

  async verifyOtp({ email, otpCode }) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const users = getUsersDB();
    const user = users.find(u => u.email.toLowerCase() === (email || '').trim().toLowerCase());
    if (!user) {
      throw new Error('User account not found');
    }
    const token = createSessionForUser(user);
    return { access_token: token, user: sanitizeUser(user) };
  },

  async resendOtp(email) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true, message: 'OTP sent successfully' };
  },

  async loginViaEmailPassword(email, password) {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!email || !password) {
      throw new Error('Please provide both email and password.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsersDB();

    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    // Verify password hash
    let isValid = false;
    if (user.passwordHash && user.salt) {
      const computedHash = await hashPassword(password, user.salt);
      isValid = (computedHash === user.passwordHash);
    } else if (user.password) {
      // Legacy unhashed password migration
      isValid = (user.password === password);
      if (isValid) {
        user.salt = generateSalt();
        user.passwordHash = await hashPassword(password, user.salt);
        delete user.password;
        saveUsersDB(users);
      }
    }

    if (!isValid) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    createSessionForUser(user);
    return currentUser;
  },

  async loginAsDemo(role = 'resident') {
    await new Promise(resolve => setTimeout(resolve, 200));

    const users = getUsersDB();
    const targetRole = role.toLowerCase();

    const demoUser = users.find(u => u.is_demo && u.role === targetRole);
    if (!demoUser) {
      throw new Error(`Demo account for '${role}' is not configured in the authentication system.`);
    }

    createSessionForUser(demoUser);
    return currentUser;
  },

  async me() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mock_auth_token') : null;
    if (!token) {
      currentUser = null;
      throw new Error('Not authenticated');
    }

    const sessions = getSessionsDB();
    const session = sessions.find(s => s.token === token);

    if (!session) {
      // Session has been invalidated or does not exist
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('mock_auth_token');
        localStorage.removeItem('mock_user');
      }
      currentUser = null;
      throw new Error('Session invalid or terminated. Please log in again.');
    }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      // Session expired
      const activeSessions = sessions.filter(s => s.token !== token);
      saveSessionsDB(activeSessions);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('mock_auth_token');
        localStorage.removeItem('mock_user');
      }
      currentUser = null;
      throw new Error('Session expired. Please log in again.');
    }

    const users = getUsersDB();
    const user = users.find(u => u.id === session.userId);
    if (!user) {
      currentUser = null;
      throw new Error('User account not found');
    }

    currentUser = sanitizeUser(user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mock_user', JSON.stringify(currentUser));
    }
    return currentUser;
  },

  setToken(token) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mock_auth_token', token);
    }
  },

  async updateMe(data) {
    const activeUser = await this.me();
    if (!activeUser) {
      throw new Error('Not authenticated');
    }

    const users = getUsersDB();
    const index = users.findIndex(u => u.id === activeUser.id);
    if (index === -1) {
      throw new Error('User account not found');
    }

    // Prevent overriding security fields
    const { passwordHash, salt, password, id, is_demo, email, ...allowed } = data;
    users[index] = {
      ...users[index],
      ...allowed,
      updated_at: new Date().toISOString(),
    };
    saveUsersDB(users);

    currentUser = sanitizeUser(users[index]);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mock_user', JSON.stringify(currentUser));
    }
    return currentUser;
  },

  logout(redirectUrl) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mock_auth_token') : null;
    if (token) {
      const sessions = getSessionsDB().filter(s => s.token !== token);
      saveSessionsDB(sessions);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mock_auth_token');
      localStorage.removeItem('mock_user');
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
    }
    currentUser = null;
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin(returnTo) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login' + (returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : '');
    }
  },

  loginWithProvider(provider, returnTo) {
    throw new Error(
      `External provider "${provider}" is not configured. Google Sign-In requires configuring OAuth credentials in Google Cloud Console and Base44. Refer to SETUP_GOOGLE_AUTH.md for instructions.`
    );
  },

  async resetPasswordRequest(email) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  },

  async resetPassword({ resetToken, newPassword }) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  },

  getUser() {
    return getActiveUser();
  }
};

export const mockBase44 = {
  auth: mockAuth,
  app: {
    async getPublicSettings() {
      return {
        id: '6abf316e513de225850faaa5',
        public_settings: {
          name: 'AEGIS',
          description: 'Emergency Safety Platform'
        }
      };
    }
  },
  entities: {
    User: {
      async list() {
        const users = getUsersDB();
        return users.map(u => ({
          id: u.id,
          name: u.name || u.full_name || u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          household_id: u.household_id
        }));
      },
      async get(id) {
        const users = getUsersDB();
        const u = users.find(x => x.id === id);
        if (!u) throw new Error('User not found');
        return {
          id: u.id,
          name: u.name || u.full_name || u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          household_id: u.household_id
        };
      },
      async filter(query = {}) {
        const users = getUsersDB();
        return users.filter(u => {
          for (const key of Object.keys(query)) {
            if (String(u[key]) !== String(query[key])) return false;
          }
          return true;
        }).map(u => ({
          id: u.id,
          name: u.name || u.full_name || u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          household_id: u.household_id
        }));
      },
      subscribe(callback) {
        return () => {};
      }
    },
    UserLocation: {
      async list() {
        const locations = JSON.parse(localStorage.getItem('mock_user_locations') || '[]');
        return locations;
      },
      async filter(query = {}) {
        const locations = JSON.parse(localStorage.getItem('mock_user_locations') || '[]');
        return locations.filter(l => {
          for (const key of Object.keys(query)) {
            if (String(l[key]) !== String(query[key])) return false;
          }
          return true;
        });
      },
      async create(data) {
        const locations = JSON.parse(localStorage.getItem('mock_user_locations') || '[]');
        const user = currentUser || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('mock_user') || 'null') : null);
        const newLocation = {
          ...data,
          id: data.id || Date.now().toString(),
          created_by_id: data.created_by_id || user?.id || data.user_id,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        locations.push(newLocation);
        localStorage.setItem('mock_user_locations', JSON.stringify(locations));
        return newLocation;
      },
      async update(id, data) {
        const locations = JSON.parse(localStorage.getItem('mock_user_locations') || '[]');
        const index = locations.findIndex(l => l.id === id);
        if (index !== -1) {
          locations[index] = {
            ...locations[index],
            ...data,
            updated_date: new Date().toISOString(),
          };
          localStorage.setItem('mock_user_locations', JSON.stringify(locations));
          return locations[index];
        }
        throw new Error('Location not found');
      },
      async delete(id) {
        const locations = JSON.parse(localStorage.getItem('mock_user_locations') || '[]');
        const filtered = locations.filter(l => l.id !== id);
        localStorage.setItem('mock_user_locations', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    Household: {
      async list() {
        let households = JSON.parse(localStorage.getItem('mock_households') || 'null');
        if (!households || households.length === 0) {
          households = [
            {
              id: 'hh-demo-1',
              name: 'Dela Cruz & Santos Demo Household',
              address: 'Poblacion Central, Tupi, South Cotabato',
              evacuation_meeting_point: 'Tupi Municipal Gym & Open Grounds',
              member_user_ids: ['demo-user-1', 'demo-user-2'],
              created_by_id: 'demo-user-1',
              created_date: new Date().toISOString(),
              updated_date: new Date().toISOString(),
            }
          ];
          localStorage.setItem('mock_households', JSON.stringify(households));
        }
        const user = getActiveUser();
        if (user) {
          return households.filter(h => 
            h.created_by_id === user.id || 
            (Array.isArray(h.member_user_ids) && h.member_user_ids.includes(user.id)) ||
            h.id === user.household_id
          );
        }
        return households;
      },
      async filter(query = {}) {
        let households = JSON.parse(localStorage.getItem('mock_households') || '[]');
        const user = getActiveUser();
        return households.filter(h => {
          for (const key of Object.keys(query)) {
            if (Array.isArray(h[key]) && !Array.isArray(query[key])) {
              if (!h[key].includes(query[key])) return false;
            } else if (String(h[key]) !== String(query[key])) {
              return false;
            }
          }
          if (user && !query.id && !query.created_by_id) {
            const isMember = (Array.isArray(h.member_user_ids) && h.member_user_ids.includes(user.id));
            if (h.created_by_id !== user.id && !isMember && h.id !== user.household_id) {
              return false;
            }
          }
          return true;
        });
      },
      async get(id) {
        let households = JSON.parse(localStorage.getItem('mock_households') || 'null');
        if (!households || households.length === 0) {
          households = [
            {
              id: 'hh-demo-1',
              name: 'Dela Cruz & Santos Demo Household',
              address: 'Poblacion Central, Tupi, South Cotabato',
              evacuation_meeting_point: 'Tupi Municipal Gym & Open Grounds',
              member_user_ids: ['demo-user-1', 'demo-user-2'],
              created_by_id: 'demo-user-1',
              created_date: new Date().toISOString(),
              updated_date: new Date().toISOString(),
            }
          ];
          localStorage.setItem('mock_households', JSON.stringify(households));
        }
        const household = households.find(h => h.id === id);
        if (!household) throw new Error('Household not found');
        return household;
      },
      async create(data) {
        const households = JSON.parse(localStorage.getItem('mock_households') || '[]');
        const user = getActiveUser();
        const newHousehold = {
          ...data,
          id: data.id || ('hh_' + Date.now().toString() + Math.random().toString(36).substring(2, 5)),
          created_by_id: data.created_by_id || user?.id,
          member_user_ids: data.member_user_ids || (user?.id ? [user.id] : []),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        households.push(newHousehold);
        localStorage.setItem('mock_households', JSON.stringify(households));
        return newHousehold;
      },
      async update(id, data) {
        const households = JSON.parse(localStorage.getItem('mock_households') || '[]');
        const index = households.findIndex(h => h.id === id);
        if (index !== -1) {
          households[index] = {
            ...households[index],
            ...data,
            updated_date: new Date().toISOString(),
          };
          localStorage.setItem('mock_households', JSON.stringify(households));
          return households[index];
        }
        throw new Error('Household not found');
      },
      async delete(id) {
        const households = JSON.parse(localStorage.getItem('mock_households') || '[]');
        const filtered = households.filter(h => h.id !== id);
        localStorage.setItem('mock_households', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    EmergencyContact: {
      async list(sort, limit) {
        let contacts = JSON.parse(localStorage.getItem('mock_emergency_contacts') || 'null');
        if (!contacts) {
          contacts = [
            {
              id: 'ec_demo_1',
              name: 'Barangay Health Center',
              relationship: 'Medical Support',
              phone: '0917-000-1122',
              priority: 'primary',
              household_id: 'hh-demo-1',
              created_by_id: 'demo-user-1',
              created_date: new Date().toISOString(),
              updated_date: new Date().toISOString(),
            }
          ];
          localStorage.setItem('mock_emergency_contacts', JSON.stringify(contacts));
        }
        const user = getActiveUser();
        if (user) {
          contacts = contacts.filter(c => 
            c.created_by_id === user.id || 
            (user.household_id && c.household_id === user.household_id)
          );
        }
        if (typeof limit === 'number') contacts = contacts.slice(0, limit);
        return contacts;
      },
      async filter(query = {}) {
        let contacts = JSON.parse(localStorage.getItem('mock_emergency_contacts') || '[]');
        const user = getActiveUser();
        return contacts.filter(c => {
          for (const key of Object.keys(query)) {
            if (String(c[key]) !== String(query[key])) return false;
          }
          if (user && !query.household_id && !query.created_by_id) {
            if (c.created_by_id !== user.id && (!user.household_id || c.household_id !== user.household_id)) {
              return false;
            }
          }
          return true;
        });
      },
      async get(id) {
        const contacts = JSON.parse(localStorage.getItem('mock_emergency_contacts') || '[]');
        const contact = contacts.find(c => c.id === id);
        if (!contact) throw new Error('Emergency contact not found');
        return contact;
      },
      async create(data) {
        const contacts = JSON.parse(localStorage.getItem('mock_emergency_contacts') || '[]');
        const user = getActiveUser();
        const newContact = {
          id: data.id || ('ec_' + Date.now().toString() + Math.random().toString(36).substring(2, 5)),
          ...data,
          created_by_id: data.created_by_id || user?.id,
          household_id: data.household_id || user?.household_id,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        contacts.push(newContact);
        localStorage.setItem('mock_emergency_contacts', JSON.stringify(contacts));
        return newContact;
      },
      async update(id, data) {
        const contacts = JSON.parse(localStorage.getItem('mock_emergency_contacts') || '[]');
        const index = contacts.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Emergency contact not found');
        contacts[index] = {
          ...contacts[index],
          ...data,
          updated_date: new Date().toISOString(),
        };
        localStorage.setItem('mock_emergency_contacts', JSON.stringify(contacts));
        return contacts[index];
      },
      async delete(id) {
        const contacts = JSON.parse(localStorage.getItem('mock_emergency_contacts') || '[]');
        const filtered = contacts.filter(c => c.id !== id);
        localStorage.setItem('mock_emergency_contacts', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    SOSAlert: {
      async list(sort, limit) {
        let alerts = JSON.parse(localStorage.getItem('mock_sos_alerts') || '[]');
        if (sort === '-created_date') {
          alerts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
        if (typeof limit === 'number') alerts = alerts.slice(0, limit);
        return alerts;
      },
      async filter(query = {}) {
        let alerts = JSON.parse(localStorage.getItem('mock_sos_alerts') || '[]');
        return alerts.filter(a => {
          for (const key of Object.keys(query)) {
            if (String(a[key]) !== String(query[key])) return false;
          }
          return true;
        });
      },
      async get(id) {
        const alerts = JSON.parse(localStorage.getItem('mock_sos_alerts') || '[]');
        const alert = alerts.find(a => a.id === id);
        if (!alert) throw new Error('SOS alert not found');
        return alert;
      },
      async create(data) {
        const alerts = JSON.parse(localStorage.getItem('mock_sos_alerts') || '[]');
        const user = currentUser || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('mock_user') || 'null') : null);
        const newAlert = {
          id: data.id || ('sos_' + Date.now().toString() + Math.random().toString(36).substring(2, 5)),
          ...data,
          created_by_id: data.sender_id || user?.id,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        alerts.unshift(newAlert);
        localStorage.setItem('mock_sos_alerts', JSON.stringify(alerts));
        return newAlert;
      },
      async update(id, data) {
        const alerts = JSON.parse(localStorage.getItem('mock_sos_alerts') || '[]');
        const index = alerts.findIndex(a => a.id === id);
        if (index === -1) throw new Error('SOS alert not found');
        alerts[index] = {
          ...alerts[index],
          ...data,
          updated_date: new Date().toISOString(),
        };
        localStorage.setItem('mock_sos_alerts', JSON.stringify(alerts));
        return alerts[index];
      },
      async delete(id) {
        const alerts = JSON.parse(localStorage.getItem('mock_sos_alerts') || '[]');
        const filtered = alerts.filter(a => a.id !== id);
        localStorage.setItem('mock_sos_alerts', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    SafetyCheckIn: {
      async list(sort, limit) {
        let checkins = JSON.parse(localStorage.getItem('mock_safety_checkins') || '[]');
        if (typeof limit === 'number') checkins = checkins.slice(0, limit);
        return checkins;
      },
      async filter(query = {}) {
        const checkins = JSON.parse(localStorage.getItem('mock_safety_checkins') || '[]');
        return checkins.filter(ci => {
          for (const key of Object.keys(query)) {
            if (String(ci[key]) !== String(query[key])) return false;
          }
          return true;
        });
      },
      async get(id) {
        const checkins = JSON.parse(localStorage.getItem('mock_safety_checkins') || '[]');
        const checkin = checkins.find(ci => ci.id === id);
        if (!checkin) throw new Error('Safety check-in not found');
        return checkin;
      },
      async create(data) {
        const checkins = JSON.parse(localStorage.getItem('mock_safety_checkins') || '[]');
        const user = currentUser || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('mock_user') || 'null') : null);
        const newCheckIn = {
          id: data.id || ('sci_' + Date.now().toString() + Math.random().toString(36).substring(2, 5)),
          ...data,
          created_by_id: data.created_by_id || user?.id,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        checkins.unshift(newCheckIn);
        localStorage.setItem('mock_safety_checkins', JSON.stringify(checkins));
        return newCheckIn;
      },
      async update(id, data) {
        const checkins = JSON.parse(localStorage.getItem('mock_safety_checkins') || '[]');
        const index = checkins.findIndex(ci => ci.id === id);
        if (index === -1) throw new Error('Safety check-in not found');
        checkins[index] = {
          ...checkins[index],
          ...data,
          updated_date: new Date().toISOString(),
        };
        localStorage.setItem('mock_safety_checkins', JSON.stringify(checkins));
        return checkins[index];
      },
      async delete(id) {
        const checkins = JSON.parse(localStorage.getItem('mock_safety_checkins') || '[]');
        const filtered = checkins.filter(ci => ci.id !== id);
        localStorage.setItem('mock_safety_checkins', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    HazardReport: {
      async list(sort, limit) {
        let reports = JSON.parse(localStorage.getItem('mock_hazard_reports') || 'null');
        if (!reports || reports.length === 0) {
          reports = [
            {
              id: 'hr_seed_1',
              type: 'cracked_road',
              description: 'Surface asphalt fissure spanning approx 8 meters along the northbound lane following the recent tremor. Caution to motorists.',
              location_label: 'Poblacion Highway near Public Market, Tupi',
              location_lat: 6.2341,
              location_lng: 125.0295,
              severity: 'high',
              status: 'verified',
              created_by_id: 'seed_user_drrmo',
              created_by_name: 'Engr. Marco Cruz',
              created_by_role: 'drrmo',
              created_date: new Date(Date.now() - 3600000 * 3).toISOString(),
              updated_date: new Date(Date.now() - 3600000 * 2).toISOString(),
            },
            {
              id: 'hr_seed_2',
              type: 'landslide',
              description: 'Loose soil and small boulders blocking the mountain shoulder. Road is currently passable but reduced to single lane.',
              location_label: 'Brgy. Acmonan Ridge Access Road',
              location_lat: 6.2482,
              location_lng: 125.0412,
              severity: 'medium',
              status: 'reported',
              created_by_id: 'seed_user_resident',
              created_by_name: 'Elena Bautista',
              created_by_role: 'resident',
              created_date: new Date(Date.now() - 3600000 * 7).toISOString(),
              updated_date: new Date(Date.now() - 3600000 * 7).toISOString(),
            }
          ];
          localStorage.setItem('mock_hazard_reports', JSON.stringify(reports));
        }
        if (sort === '-created_date') {
          reports.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        } else if (sort === 'created_date') {
          reports.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        }
        if (typeof limit === 'number') {
          reports = reports.slice(0, limit);
        }
        return reports;
      },
      async get(id) {
        const reports = JSON.parse(localStorage.getItem('mock_hazard_reports') || '[]');
        const report = reports.find(r => r.id === id);
        if (!report) throw new Error('Report not found');
        return report;
      },
      async create(data) {
        const reports = JSON.parse(localStorage.getItem('mock_hazard_reports') || '[]');
        const user = currentUser || JSON.parse(localStorage.getItem('mock_user') || 'null');
        const newReport = {
          ...data,
          id: Date.now().toString(),
          created_by_id: user?.id || 'anon',
          created_by_name: data.created_by_name || user?.name || user?.email?.split('@')[0] || 'Community Member',
          created_by_role: data.created_by_role || user?.role || 'resident',
          status: data.status || 'reported',
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        reports.unshift(newReport);
        localStorage.setItem('mock_hazard_reports', JSON.stringify(reports));
        return newReport;
      },
      async update(id, data) {
        const reports = JSON.parse(localStorage.getItem('mock_hazard_reports') || '[]');
        const index = reports.findIndex(r => r.id === id);
        if (index !== -1) {
          reports[index] = {
            ...reports[index],
            ...data,
            updated_date: new Date().toISOString(),
          };
          localStorage.setItem('mock_hazard_reports', JSON.stringify(reports));
          return reports[index];
        }
        throw new Error('Report not found');
      },
      async delete(id) {
        const reports = JSON.parse(localStorage.getItem('mock_hazard_reports') || '[]');
        const filtered = reports.filter(r => r.id !== id);
        localStorage.setItem('mock_hazard_reports', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    Announcement: {
      async list(sort, limit) {
        let announcements = JSON.parse(localStorage.getItem('mock_announcements') || 'null');
        if (!announcements || announcements.length === 0) {
          announcements = [
            {
              id: 'ann_seed_official_1',
              title: 'Official Advisory: Regional Fault Monitoring & Community Evacuation Preparedness',
              content: 'The Municipal DRRMO has heightened active monitoring along local fault segments following tremors. Evacuation routes and designated centers at the Municipal Gymnasium and Central Elementary School remain fully operational with standby responders. Community members are advised to inspect household go-bags and rely only on official channels.',
              type: 'verified_advisory',
              priority: 'critical',
              target_audience: 'all',
              created_by_id: 'seed_user_drrmo',
              created_by_name: 'Engr. Marco Cruz',
              created_by_role: 'drrmo',
              created_date: new Date(Date.now() - 3600000 * 4).toISOString(),
              updated_date: new Date(Date.now() - 3600000 * 4).toISOString(),
            },
            {
              id: 'ann_seed_community_1',
              title: 'Purok 2 Multi-Purpose Hall Emergency Drinking Water & First-Aid Supplies Available',
              content: 'Our barangay youth volunteers have set up clean drinking water refilling and basic first-aid supply kits at the Purok 2 multi-purpose kiosk for all neighboring families.',
              type: 'community',
              priority: 'info',
              target_audience: 'residents',
              created_by_id: 'seed_user_resident',
              created_by_name: 'Elena Bautista',
              created_by_role: 'resident',
              created_date: new Date(Date.now() - 3600000 * 10).toISOString(),
              updated_date: new Date(Date.now() - 3600000 * 10).toISOString(),
            }
          ];
          localStorage.setItem('mock_announcements', JSON.stringify(announcements));
        }

        // Pin official verified advisories to the top, then sort by created_date descending
        announcements.sort((a, b) => {
          const aIsOfficial = a.type === 'verified_advisory';
          const bIsOfficial = b.type === 'verified_advisory';
          if (aIsOfficial && !bIsOfficial) return -1;
          if (!aIsOfficial && bIsOfficial) return 1;
          return new Date(b.created_date) - new Date(a.created_date);
        });

        if (typeof limit === 'number') {
          announcements = announcements.slice(0, limit);
        }
        return announcements;
      },
      async get(id) {
        const announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
        const announcement = announcements.find(a => a.id === id);
        if (!announcement) throw new Error('Announcement not found');
        return announcement;
      },
      async create(data) {
        const announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
        const user = currentUser || JSON.parse(localStorage.getItem('mock_user') || 'null');
        const role = user?.role || 'resident';
        const isAdminOrOfficial = ['admin', 'lgu', 'drrmo'].includes(role);

        // Server-side enforcement: Only Admin/LGU/DRRMO can publish verified_advisory
        if (data.type === 'verified_advisory' && !isAdminOrOfficial) {
          throw new Error('Unauthorized: Only Admin or LGU-DRRMO can publish official verified advisories.');
        }

        const newAnnouncement = {
          ...data,
          id: Date.now().toString(),
          type: data.type || 'community',
          priority: data.priority || 'info',
          target_audience: data.target_audience || 'all',
          created_by_id: user?.id || 'anon',
          created_by_name: data.created_by_name || user?.name || user?.email?.split('@')[0] || 'Community Member',
          created_by_role: role,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        announcements.unshift(newAnnouncement);
        localStorage.setItem('mock_announcements', JSON.stringify(announcements));
        return newAnnouncement;
      },
      async update(id, data) {
        const announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
        const user = currentUser || JSON.parse(localStorage.getItem('mock_user') || 'null');
        const role = user?.role || 'resident';
        const isAdminOrOfficial = ['admin', 'lgu', 'drrmo'].includes(role);

        const index = announcements.findIndex(a => a.id === id);
        if (index === -1) throw new Error('Announcement not found');

        // Check permission if trying to promote to verified_advisory
        if (data.type === 'verified_advisory' && !isAdminOrOfficial) {
          throw new Error('Unauthorized: Only Admin or LGU-DRRMO can publish official verified advisories.');
        }

        announcements[index] = {
          ...announcements[index],
          ...data,
          updated_date: new Date().toISOString(),
        };
        localStorage.setItem('mock_announcements', JSON.stringify(announcements));
        return announcements[index];
      },
      async delete(id) {
        const announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
        const filtered = announcements.filter(a => a.id !== id);
        localStorage.setItem('mock_announcements', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    Comment: {
      async list(sort, limit) {
        let comments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
        if (sort === '-created_date') {
          comments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        } else if (sort === 'created_date') {
          comments.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        }
        if (typeof limit === 'number') {
          comments = comments.slice(0, limit);
        }
        return comments;
      },
      async filter(query = {}) {
        let comments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
        return comments.filter(c => {
          for (const key of Object.keys(query)) {
            if (String(c[key]) !== String(query[key])) return false;
          }
          return true;
        });
      },
      async get(id) {
        const comments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
        const comment = comments.find(c => c.id === id);
        if (!comment) throw new Error('Comment not found');
        return comment;
      },
      async create(data) {
        const comments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
        const user = currentUser || JSON.parse(localStorage.getItem('mock_user') || 'null');
        const newComment = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
          target_type: data.target_type,
          target_id: String(data.target_id),
          parent_comment_id: data.parent_comment_id || null,
          body: data.body,
          author_name: data.author_name || user?.name || user?.email?.split('@')[0] || 'Community Member',
          author_role: data.author_role || user?.role || 'resident',
          is_hidden: data.is_hidden || false,
          created_by_id: user?.id || 'anon',
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        comments.push(newComment);
        localStorage.setItem('mock_comments', JSON.stringify(comments));
        return newComment;
      },
      async update(id, data) {
        const comments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
        const index = comments.findIndex(c => c.id === id);
        if (index !== -1) {
          comments[index] = {
            ...comments[index],
            ...data,
            updated_date: new Date().toISOString(),
          };
          localStorage.setItem('mock_comments', JSON.stringify(comments));
          return comments[index];
        }
        throw new Error('Comment not found');
      },
      async delete(id) {
        const comments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
        const filtered = comments.filter(c => c.id !== id);
        localStorage.setItem('mock_comments', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    Reaction: {
      async list(sort, limit) {
        let reactions = JSON.parse(localStorage.getItem('mock_reactions') || '[]');
        if (typeof limit === 'number') reactions = reactions.slice(0, limit);
        return reactions;
      },
      async filter(query = {}) {
        let reactions = JSON.parse(localStorage.getItem('mock_reactions') || '[]');
        return reactions.filter(r => {
          for (const key of Object.keys(query)) {
            if (String(r[key]) !== String(query[key])) return false;
          }
          return true;
        });
      },
      async get(id) {
        const reactions = JSON.parse(localStorage.getItem('mock_reactions') || '[]');
        const reaction = reactions.find(r => r.id === id);
        if (!reaction) throw new Error('Reaction not found');
        return reaction;
      },
      async create(data) {
        const reactions = JSON.parse(localStorage.getItem('mock_reactions') || '[]');
        const user = currentUser || JSON.parse(localStorage.getItem('mock_user') || 'null');
        const userId = user?.id || 'anon';
        
        // Prevent duplicate reaction of same type by same user on same target
        const existingIndex = reactions.findIndex(
          r => r.target_type === data.target_type &&
               String(r.target_id) === String(data.target_id) &&
               r.reaction_type === data.reaction_type &&
               r.created_by_id === userId
        );
        if (existingIndex !== -1) {
          return reactions[existingIndex];
        }

        const newReaction = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
          target_type: data.target_type,
          target_id: String(data.target_id),
          reaction_type: data.reaction_type,
          created_by_id: userId,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        reactions.push(newReaction);
        localStorage.setItem('mock_reactions', JSON.stringify(reactions));
        return newReaction;
      },
      async delete(id) {
        const reactions = JSON.parse(localStorage.getItem('mock_reactions') || '[]');
        const filtered = reactions.filter(r => r.id !== id);
        localStorage.setItem('mock_reactions', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    },
    ContentFlag: {
      async list(sort, limit) {
        let flags = JSON.parse(localStorage.getItem('mock_content_flags') || '[]');
        if (sort === '-created_date') {
          flags.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        } else if (sort === 'created_date') {
          flags.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        }
        if (typeof limit === 'number') flags = flags.slice(0, limit);
        return flags;
      },
      async filter(query = {}) {
        let flags = JSON.parse(localStorage.getItem('mock_content_flags') || '[]');
        return flags.filter(f => {
          for (const key of Object.keys(query)) {
            if (String(f[key]) !== String(query[key])) return false;
          }
          return true;
        });
      },
      async get(id) {
        const flags = JSON.parse(localStorage.getItem('mock_content_flags') || '[]');
        const flag = flags.find(f => f.id === id);
        if (!flag) throw new Error('Flag not found');
        return flag;
      },
      async create(data) {
        const flags = JSON.parse(localStorage.getItem('mock_content_flags') || '[]');
        const user = currentUser || JSON.parse(localStorage.getItem('mock_user') || 'null');
        const newFlag = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
          target_type: data.target_type,
          target_id: String(data.target_id),
          reason: data.reason,
          details: data.details || '',
          status: data.status || 'open',
          created_by_id: user?.id || 'anon',
          reporter_name: user?.name || user?.email?.split('@')[0] || 'Community Member',
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        flags.push(newFlag);
        localStorage.setItem('mock_content_flags', JSON.stringify(flags));
        return newFlag;
      },
      async update(id, data) {
        const flags = JSON.parse(localStorage.getItem('mock_content_flags') || '[]');
        const index = flags.findIndex(f => f.id === id);
        if (index !== -1) {
          flags[index] = {
            ...flags[index],
            ...data,
            updated_date: new Date().toISOString(),
          };
          localStorage.setItem('mock_content_flags', JSON.stringify(flags));
          return flags[index];
        }
        throw new Error('Flag not found');
      },
      async delete(id) {
        const flags = JSON.parse(localStorage.getItem('mock_content_flags') || '[]');
        const filtered = flags.filter(f => f.id !== id);
        localStorage.setItem('mock_content_flags', JSON.stringify(filtered));
        return { success: true };
      },
      subscribe(callback) {
        return () => {};
      }
    }
  },
  functions: {
    async invoke(functionName, payload = {}) {
      if (functionName === 'aegisAssistant') {
        const reply = generateAIAssistantReply(payload.message || '', payload.history || []);
        return { data: { reply } };
      }
      return { data: {} };
    }
  },
  integrations: {
    Core: {
      async UploadPublicFile({ file }) {
        // Mock file upload - convert to base64 data URL
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ file_url: reader.result });
          };
          reader.readAsDataURL(file);
        });
      }
    }
  }
};
