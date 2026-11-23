/**
 * Phase 0 Security Rules Test Specification ("Dirty Dozen" Payloads)
 *
 * Verifies that all 12 adversarial payloads targeting Identity, Integrity,
 * Master Gate, Immutability, Boundary Limits, and Query Enforcement are
 * rejected with PERMISSION_DENIED by firestore.rules.
 *
 * Note: Intended to run against the Firebase Emulator Suite with
 * @firebase/rules-unit-testing when local emulators are available.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  pillar: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated read of private user profile',
    pillar: 'Pillar 6: PII & Private Isolation',
    operation: 'get',
    path: '/users/userA',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-user read of another player profile',
    pillar: 'Pillar 6: PII & Private Isolation',
    operation: 'get',
    path: '/users/userA',
    auth: { uid: 'userB', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity spoofing via mismatched ownerId on create',
    pillar: 'Pillar 2: Identity Integrity',
    operation: 'create',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      ownerId: 'userB',
      displayName: 'Spoofer',
      srbRank: 0,
      activeCycle: 1,
      activePath: 1,
      currentRebirth: 1,
      completedAllTiersInCycle: false,
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Write attempted by unverified email account',
    pillar: 'Verified Users Mandate',
    operation: 'create',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: false },
    payload: {
      ownerId: 'userA',
      displayName: 'Unverified',
      srbRank: 0,
      activeCycle: 1,
      activePath: 1,
      currentRebirth: 1,
      completedAllTiersInCycle: false,
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow / ghost field injection (isAdmin: true)',
    pillar: 'Pillar 2: Strict Keys (hasOnly)',
    operation: 'create',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      ownerId: 'userA',
      displayName: 'Ghost',
      srbRank: 0,
      activeCycle: 1,
      activePath: 1,
      currentRebirth: 1,
      completedAllTiersInCycle: false,
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Forged client timestamp on create',
    pillar: 'Temporal Integrity (request.time)',
    operation: 'create',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      ownerId: 'userA',
      displayName: 'ForgedTime',
      srbRank: 0,
      activeCycle: 1,
      activePath: 1,
      currentRebirth: 1,
      completedAllTiersInCycle: false,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Tampering with immutable createdAt / ownerId on update',
    pillar: 'Immortal Field Rule',
    operation: 'update',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      ownerId: 'userB',
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Value poisoning on allowed field (activePath = 99, displayName > 100 chars)',
    pillar: 'Pillar 2: Anti-Update-Gap & Boundary Limits',
    operation: 'update',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      activePath: 99,
      displayName: 'X'.repeat(150),
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Orphaned subcollection write without parent /users/{userId}',
    pillar: 'Pillar 1: Master Gate',
    operation: 'create',
    path: '/users/userWithoutProfile/droids/droid-1',
    auth: { uid: 'userWithoutProfile', email_verified: true },
    payload: {
      ownerId: 'userWithoutProfile',
      name: 'R2',
      type: 'Astromech',
      rarity: 'Base',
      quantity: 1,
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Invalid rarity enum and non-positive quantity on droid document',
    pillar: 'Pillar 2: Type Safety & Enum Guard',
    operation: 'create',
    path: '/users/userA/droids/droid-bad',
    auth: { uid: 'userA', email_verified: true },
    payload: {
      ownerId: 'userA',
      name: 'R2',
      type: 'Astromech',
      rarity: 'MythicHacked',
      quantity: 0,
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'ID poisoning with oversized document ID (> 128 chars)',
    pillar: 'Pillar 3: Path Variable Hardening',
    operation: 'create',
    path: `/users/userA/droids/${'a'.repeat(160)}`,
    auth: { uid: 'userA', email_verified: true },
    payload: {
      ownerId: 'userA',
      name: 'Gonk',
      type: 'Worker',
      rarity: 'Base',
      quantity: 1,
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Cross-user subcollection list and immutable srbHistory update',
    pillar: 'Pillar 8: Secure List Queries & Immutable Log',
    operation: 'list',
    path: '/users/userA/droids',
    auth: { uid: 'userB', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
