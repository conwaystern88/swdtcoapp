# Security Specification: Star Wars Droid Tycoon Tracker

## 1. Data Invariants

1. **Strict Owner Isolation (Zero-Trust PII & Private Progression)**: Every progression profile (`/users/{userId}`) and every subcollection document (`/users/{userId}/droids/{droidId}`, `/users/{userId}/srbHistory/{entryId}`, `/users/{userId}/customDroids/{customDroidId}`) belongs exclusively to `userId` (`ownerId == userId == request.auth.uid`). No authenticated user may read, list, create, update, or delete another user's documents.
2. **Verified Email Gate**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Master Gate Relational Integrity**: No subcollection document (`droids`, `srbHistory`, `customDroids`) may be created, updated, or deleted unless the parent `/users/{userId}` document exists and its `ownerId == request.auth.uid`.
4. **Strict Key Allowlisting & Anti-Update-Gap**: Every create enforces `keys().hasAll(...) && keys().hasOnly(...)`, and every update enforces `isValid[Entity](incoming())` together with action-scoped `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
5. **Temporal Integrity & Immutability**: `ownerId` and `createdAt` are immutable after creation; `createdAt == request.time` on create, and `updatedAt == request.time` on create and update. `srbHistory` documents are immutable append-only records (`allow update: if false`).
6. **Boundary & Path Hardening**: Every single-document target ID (`userId`, `droidId`, `entryId`, `customDroidId`) matches `^[a-zA-Z0-9_\-]+$` (`size() <= 128`), and every string/int field enforces tight size/range/enum bounds.
7. **Secure List Queries**: `/users` disallows `list` entirely. Subcollection `allow list` rules explicitly verify `request.auth.uid == userId && resource.data.ownerId == request.auth.uid` without calling `get()` or `exists()`.

## 2. The "Dirty Dozen" Adversarial Payloads

All 12 payloads below MUST evaluate to `PERMISSION_DENIED`:

1. **Unauthenticated Read/Write**: Read `/users/userA` with `auth == null`.
2. **Cross-User Read (PII / Private Data Leak)**: Signed in as `userB`, `get` `/users/userA`.
3. **Identity Spoofing on Create**: Signed in as `userA`, create `/users/userA` with `ownerId: "userB"`.
4. **Unverified Email Write**: Signed in as `userA` with `email_verified: false`, create `/users/userA`.
5. **Shadow / Ghost Field Injection**: Signed in as `userA`, create `/users/userA` with extra field `isAdmin: true`.
6. **Client Timestamp Forgery**: Signed in as `userA`, create `/users/userA` with `createdAt` set to a past timestamp (`!= request.time`).
7. **Immutable Field Tampering**: Signed in as `userA`, update `/users/userA` attempting to alter `ownerId` or `createdAt`.
8. **Value Poisoning on Allowed Key**: Signed in as `userA`, update `/users/userA` setting `activePath: 99` or `currentRebirth: 500` or `displayName: "x".repeat(200)`.
9. **Orphaned Subcollection Write (Master Gate Bypass)**: Signed in as `userA` when `/users/userA` does NOT exist, create `/users/userA/droids/d1`.
10. **Invalid Enum / Quantity Poisoning on Droid**: Signed in as `userA`, create `/users/userA/droids/d1` with `rarity: "Hacked"` or `quantity: 0` or `type: "Invalid"`.
11. **Path Variable ID Poisoning**: Signed in as `userA`, create `/users/userA/droids/${"a".repeat(200)}` (exceeds 128-char ID limit / bad chars).
12. **History Tampering & Cross-User Subcollection List**: Signed in as `userA`, update an immutable `/users/userA/srbHistory/h1` entry, OR signed in as `userB`, `list` `/users/userA/droids`.
