// @ts-nocheck
// Mock Authentication for Development
// This allows you to test the UI without a working Base44 backend

const MOCK_USERS = [
  {
    id: '1',
    email: 'flearjoem@gmail.com',
    password: 'password123',
    name: 'Test User',
    phone: '09855719264'
  }
];

let currentUser = null;

export const mockAuth = {
  async register({ email, password }) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user already exists
    const existing = MOCK_USERS.find(u => u.email === email);
    if (existing) {
      throw new Error('User already exists');
    }
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      name: email.split('@')[0],
      phone: ''
    };
    
    MOCK_USERS.push(newUser);
    currentUser = { ...newUser };
    delete currentUser.password;
    
    // Store token
    const token = 'mock-token-' + newUser.id;
    localStorage.setItem('mock_auth_token', token);
    localStorage.setItem('mock_user', JSON.stringify(currentUser));
    
    // Return access token immediately (skip OTP in mock mode)
    return { access_token: token };
  },

  async verifyOtp({ email, otpCode }) {
    // Mock OTP verification - any 6-digit code works
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const user = MOCK_USERS.find(u => u.email === email);
    if (!user) {
      throw new Error('User not found');
    }
    
    currentUser = { ...user };
    delete currentUser.password;
    
    const token = 'mock-token-' + user.id;
    localStorage.setItem('mock_auth_token', token);
    localStorage.setItem('mock_user', JSON.stringify(currentUser));
    
    return { access_token: token };
  },

  async resendOtp(email) {
    // Mock resend OTP - just simulate success
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true, message: 'OTP sent successfully' };
  },

  async loginViaEmailPassword(email, password) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    currentUser = { ...user };
    delete currentUser.password;
    
    localStorage.setItem('mock_auth_token', 'mock-token-' + user.id);
    localStorage.setItem('mock_user', JSON.stringify(currentUser));
    
    return currentUser;
  },

  async me() {
    const token = localStorage.getItem('mock_auth_token');
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const user = localStorage.getItem('mock_user');
    if (user) {
      currentUser = JSON.parse(user);
      return currentUser;
    }
    
    throw new Error('User not found');
  },

  setToken(token) {
    localStorage.setItem('mock_auth_token', token);
  },

  async updateMe(data) {
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    
    currentUser = { ...currentUser, ...data };
    localStorage.setItem('mock_user', JSON.stringify(currentUser));
    return currentUser;
  },

  logout(redirectUrl) {
    localStorage.removeItem('mock_auth_token');
    localStorage.removeItem('mock_user');
    currentUser = null;
    if (redirectUrl) {
      window.location.href = '/login';
    }
  },

  redirectToLogin(returnTo) {
    window.location.href = '/login' + (returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : '');
  },

  getUser() {
    return currentUser;
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
    UserLocation: {
      async list() {
        const locations = JSON.parse(localStorage.getItem('mock_user_locations') || '[]');
        return locations;
      },
      async filter(query) {
        const locations = JSON.parse(localStorage.getItem('mock_user_locations') || '[]');
        if (query.created_by_id) {
          return locations.filter(l => l.created_by_id === query.created_by_id);
        }
        return locations;
      },
      async create(data) {
        const locations = JSON.parse(localStorage.getItem('mock_user_locations') || '[]');
        const newLocation = {
          ...data,
          id: Date.now().toString(),
          created_by_id: currentUser?.id,
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
        const households = JSON.parse(localStorage.getItem('mock_households') || '[]');
        return households;
      },
      async get(id) {
        const households = JSON.parse(localStorage.getItem('mock_households') || '[]');
        const household = households.find(h => h.id === id);
        if (!household) throw new Error('Household not found');
        return household;
      },
      async create(data) {
        const households = JSON.parse(localStorage.getItem('mock_households') || '[]');
        const newHousehold = {
          ...data,
          id: Date.now().toString(),
          created_by_id: currentUser?.id,
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
    HazardReport: {
      async list() {
        const reports = JSON.parse(localStorage.getItem('mock_hazard_reports') || '[]');
        return reports;
      },
      async create(data) {
        const reports = JSON.parse(localStorage.getItem('mock_hazard_reports') || '[]');
        const newReport = {
          ...data,
          id: Date.now().toString(),
          created_by_id: currentUser?.id,
          created_by_name: currentUser?.name || currentUser?.email,
          status: 'reported',
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        reports.push(newReport);
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
      async list() {
        const announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
        return announcements;
      },
      async create(data) {
        const announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
        const newAnnouncement = {
          ...data,
          id: Date.now().toString(),
          created_by_id: currentUser?.id,
          created_by_name: currentUser?.name || currentUser?.email,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        announcements.push(newAnnouncement);
        localStorage.setItem('mock_announcements', JSON.stringify(announcements));
        return newAnnouncement;
      },
      async update(id, data) {
        const announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
        const index = announcements.findIndex(a => a.id === id);
        if (index !== -1) {
          announcements[index] = {
            ...announcements[index],
            ...data,
            updated_date: new Date().toISOString(),
          };
          localStorage.setItem('mock_announcements', JSON.stringify(announcements));
          return announcements[index];
        }
        throw new Error('Announcement not found');
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
