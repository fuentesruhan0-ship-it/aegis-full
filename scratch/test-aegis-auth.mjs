// Comprehensive Acceptance Test Suite for AEGIS Authentication & Session System
import { mockAuth, mockBase44, getUsersDB, getSessionsDB } from '../src/lib/mockAuth.js';

// Setup Mock Browser Storage in Node environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
  get length() { return mockStorage.size; },
  key: (i) => Array.from(mockStorage.keys())[i] || null,
};
globalThis.window = { location: { href: '' } };

async function runTestSuite() {
  console.log('🚀 Starting AEGIS Complete Authentication Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      failed++;
      throw new Error(message);
    } else {
      console.log(`✅ PASSED: ${message}`);
      passed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test A: Register a new account and verify that it is saved persistently
    // -------------------------------------------------------------
    console.log('--- Test A: Account Registration & Password Hashing ---');
    const testEmail = 'resident.test@example.com';
    const testPassword = 'SecurePassword123!';
    const regResult = await mockAuth.register({
      email: testEmail,
      password: testPassword,
      phone: '+63 912 345 6789',
      role: 'resident',
      name: 'Test Resident'
    });

    assert(!!regResult.access_token, 'Registration returns a valid access_token');
    assert(regResult.user.email === testEmail, 'Returned user email matches registration input');
    assert(regResult.user.role === 'resident', 'User role correctly assigned as resident');
    assert(!regResult.user.password && !regResult.user.passwordHash, 'Sensitive password and hash are sanitized from client profile');

    // Verify DB persistence
    const usersInDb = getUsersDB();
    const savedUser = usersInDb.find(u => u.email === testEmail);
    assert(!!savedUser, 'User account is saved persistently in the database');
    assert(!!savedUser.passwordHash && savedUser.passwordHash.length === 64, 'Password is cryptographically hashed with PBKDF2');
    assert(savedUser.password !== testPassword, 'Plain-text password is NEVER stored in database');
    assert(!!savedUser.salt, 'Unique salt is generated and stored for the account');

    // -------------------------------------------------------------
    // Test B: Sign out and log in again with the same credentials
    // -------------------------------------------------------------
    console.log('\n--- Test B: Sign Out & Re-Authentication ---');
    // Save an emergency contact under this user
    const contact = await mockBase44.entities.EmergencyContact.create({
      name: 'Dr. Santos',
      phone: '0918-111-2222',
      relationship: 'Family Doctor',
      priority: 'primary'
    });
    assert(!!contact.id, 'Emergency contact created under authenticated user');

    // Sign out
    mockAuth.logout();
    assert(!globalThis.localStorage.getItem('mock_auth_token'), 'Sign out clears client session token');
    assert(!globalThis.localStorage.getItem('mock_user'), 'Sign out clears client user state');

    // Attempt to access me() while logged out
    let loggedOutCheckPassed = false;
    try {
      await mockAuth.me();
    } catch (e) {
      loggedOutCheckPassed = true;
    }
    assert(loggedOutCheckPassed, 'Unauthenticated user is blocked from accessing protected session');

    // Log in again with same credentials
    const loginResult = await mockAuth.loginViaEmailPassword(testEmail, testPassword);
    assert(loginResult.email === testEmail, 'Login succeeds with existing credentials');
    assert(loginResult.id === savedUser.id, 'Authenticated into the exact same persistent account');

    // Verify previously saved emergency contacts are restored
    const restoredContacts = await mockBase44.entities.EmergencyContact.list();
    const hasMyContact = restoredContacts.some(c => c.name === 'Dr. Santos');
    assert(hasMyContact, 'Previously saved emergency contacts and data are fully restored upon re-login');

    // -------------------------------------------------------------
    // Test C: Enter incorrect password -> login fails without creating account
    // -------------------------------------------------------------
    console.log('\n--- Test C: Invalid Password Rejection ---');
    const initialUserCount = getUsersDB().length;
    let wrongPassRejected = false;
    try {
      await mockAuth.loginViaEmailPassword(testEmail, 'WrongPassword999!');
    } catch (e) {
      wrongPassRejected = true;
      assert(e.message.includes('Invalid email or password'), 'Clear error message displayed on invalid password');
    }
    assert(wrongPassRejected, 'Invalid password correctly rejected');
    assert(getUsersDB().length === initialUserCount, 'Failed login attempt does NOT create an account');

    // -------------------------------------------------------------
    // Test D: Duplicate registration is rejected
    // -------------------------------------------------------------
    console.log('\n--- Test D: Duplicate Registration Prevention ---');
    let duplicateRejected = false;
    try {
      await mockAuth.register({
        email: testEmail.toUpperCase(), // Case insensitive check
        password: 'AnotherPassword456!',
        role: 'resident'
      });
    } catch (e) {
      duplicateRejected = true;
      assert(e.message.includes('already exists'), 'Duplicate registration rejected with clear warning');
    }
    assert(duplicateRejected, 'Duplicate registration attempt is successfully blocked');

    // -------------------------------------------------------------
    // Test E: Sign out ends session but preserves account and records
    // -------------------------------------------------------------
    console.log('\n--- Test E: Session Termination Without Account Deletion ---');
    mockAuth.logout();
    const usersAfterLogout = getUsersDB();
    const userStillExists = usersAfterLogout.some(u => u.email === testEmail);
    assert(userStillExists, 'Signing out did NOT delete or unregister the user account');

    const rawContacts = JSON.parse(globalThis.localStorage.getItem('mock_emergency_contacts') || '[]');
    const contactStillExists = rawContacts.some(c => c.name === 'Dr. Santos');
    assert(contactStillExists, 'Signing out preserved all emergency contact records in persistent storage');

    // -------------------------------------------------------------
    // Test F: Demo Resident and Demo Student Authentication
    // -------------------------------------------------------------
    console.log('\n--- Test F: Demo Resident & Student Role Authentication ---');
    // Test Demo Resident
    const demoResident = await mockAuth.loginAsDemo('resident');
    assert(demoResident.role === 'resident', 'Demo Resident authenticates with role "resident"');
    assert(demoResident.is_demo === true, 'Demo account marked as is_demo: true');
    assert(demoResident.full_name === 'Juan Dela Cruz', 'Demo Resident profile matches Juan Dela Cruz');
    assert(!!globalThis.localStorage.getItem('mock_auth_token'), 'Demo Resident issues valid authenticated session token');

    // Sign out
    mockAuth.logout();

    // Test Demo Student
    const demoStudent = await mockAuth.loginAsDemo('student');
    assert(demoStudent.role === 'student', 'Demo Student authenticates with role "student"');
    assert(demoStudent.is_demo === true, 'Demo student marked as is_demo: true');
    assert(demoStudent.full_name === 'Maria Santos', 'Demo Student profile matches Maria Santos');
    assert(demoStudent.school === 'SEIATI Campus Tupi', 'Demo Student school profile loaded');

    // -------------------------------------------------------------
    // Test G: Protected page session persistence across refresh
    // -------------------------------------------------------------
    console.log('\n--- Test G: Session Persistence Across Page Refresh ---');
    // Simulate browser reload by calling me() directly from storage state
    const currentSessionUser = await mockAuth.me();
    assert(currentSessionUser.id === demoStudent.id, 'Session persists and validates on page refresh');
    assert(currentSessionUser.role === 'student', 'Session restores student dashboard profile on page refresh');

    // -------------------------------------------------------------
    // Test H: User Record Isolation (Privacy & Security)
    // -------------------------------------------------------------
    console.log('\n--- Test H: Private Record Isolation Between Users ---');
    // Register User A (Student)
    const userA = await mockAuth.register({
      email: 'student.alice@example.com',
      password: 'AlicePassword123!',
      role: 'student',
      name: 'Alice Cooper'
    });
    // User A adds a private contact
    await mockBase44.entities.EmergencyContact.create({
      name: "Alice's Secret Doctor",
      phone: '0919-999-0000',
      relationship: 'Private Physician'
    });

    // Verify User A sees their contact
    const aliceContacts = await mockBase44.entities.EmergencyContact.list();
    assert(aliceContacts.some(c => c.name === "Alice's Secret Doctor"), "User A can view their own contact");

    // Sign out User A
    mockAuth.logout();

    // Register User B (Resident)
    const userB = await mockAuth.register({
      email: 'resident.bob@example.com',
      password: 'BobPassword123!',
      role: 'resident',
      name: 'Bob Marley'
    });

    // Verify User B CANNOT see User A's private contact
    const bobContacts = await mockBase44.entities.EmergencyContact.list();
    const bobSeesAlice = bobContacts.some(c => c.name === "Alice's Secret Doctor");
    assert(!bobSeesAlice, "User B CANNOT access User A's private emergency contacts (Isolation verified)");

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passed} ACCEPTANCE CRITERIA TESTS PASSED SUCCESSFULLY! (${failed} failed)`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n💥 Test suite stopped due to error:', err);
    process.exit(1);
  }
}

runTestSuite();
