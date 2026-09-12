# Firestore Database Architecture & Schema Guide

This document outlines the database architecture, schema specification, security rules, index optimizations, and migration procedures for self-hosting Continuum Home on Google Cloud Firestore.

---

## 1. Architectural Principles

Continuum Home adheres to three core database architectural tenets:

1. **Path-Isolated Subcollections**: User data is isolated under hierarchical subcollections rooted at `/users/{userId}`. Security rules enforce access control at the path level rather than evaluating runtime query filters across shared root collections.
2. **Read-Optimized Bucketed Caching**: High-frequency, large-volume collections (such as media watchlists) use a single-document bucketed map pattern (`/users/{userId}/watchlists/default`). This avoids the Firestore read multiplier trap, delivering complete list lookups to the UI and AI assistant in exactly 1 document read.
3. **Encrypted Ciphertext Index Pruning**: Sensitive financial and personal fields are encrypted client/server-side using AES-256-GCM. Because random ciphertext cannot be meaningfully range-queried, automatic single-field B-tree indexing is explicitly disabled to minimize storage overhead and write latency.

---

## 2. Directory Hierarchy

```text
/users/{userId}                                 [Root anchor document per user]
│
├── /expenses/{expenseId}                       [Subcollection: individual transaction documents]
│
├── /subscriptions/{subscriptionId}             [Subcollection: recurring subscriptions]
│
├── /portfolio/summary                          [Single document: investment holdings & history]
│
├── /settings/preferences                       [Single document: UI settings, salary schedule, release dismissals]
│
└── /watchlists/default                         [Single document: bucketed map of all media items]

/recommendations/{date}                         [System collection: AI financial advice & health summaries]
```

---

## 3. Collection Specifications

### 3.1. User Anchor Document
* **Path**: `/users/{userId}`
* **Purpose**: Represents the registered user identity. Ensures clean discovery in admin tools and cloud backups.
* **Fields**:
  * `updatedAt` (*number*): Unix epoch timestamp of the last schema or profile touch.

### 3.2. Expenses
* **Path**: `/users/{userId}/expenses/{expenseId}`
* **Purpose**: Records financial expenditures and transactions.
* **Fields**:
  * `userId` (*string*): Firebase Auth UID of the record owner.
  * `title` (*string, encrypted*): AES-256-GCM encrypted transaction description.
  * `amount` (*string, encrypted*): AES-256-GCM encrypted monetary value.
  * `category` (*string, encrypted*): AES-256-GCM encrypted expense classification category.
  * `notes` (*string, encrypted, optional*): AES-256-GCM encrypted memo or remarks.
  * `date` (*string*): Standard ISO date format (`YYYY-MM-DD`).
  * `createdAt` (*number*): Epoch timestamp when the expense was logged.

### 3.3. Subscriptions
* **Path**: `/users/{userId}/subscriptions/{subscriptionId}`
* **Purpose**: Recurring services, bills, and utilities.
* **Fields**:
  * `userId` (*string*): Firebase Auth UID.
  * `name` (*string*): Service name (e.g., Netflix, Spotify).
  * `cost` (*number*): Billing amount.
  * `billingCycle` (*string*): `"monthly"` or `"yearly"`.
  * `category` (*string*): Grouping tag.
  * `nextBillingDate` (*string*): Projected renewal date (`YYYY-MM-DD`).
  * `createdAt` (*number*): Epoch timestamp.

### 3.4. Portfolio Summary
* **Path**: `/users/{userId}/portfolio/summary`
* **Purpose**: Aggregated investment portfolio holdings and net worth history.
* **Fields**:
  * `assets` (*array of objects, encrypted*): List of equities, mutual funds, gold, crypto, cash, and fixed deposits. Asset quantities, costs, and current valuations are encrypted before write.
  * `valuationHistory` (*map, encrypted*): Date-keyed historical portfolio valuations (`{ "YYYY-MM-DD": encryptedValue }`).
  * `updatedAt` (*number*): Timestamp of the last market price or balance refresh.

### 3.5. Settings & Preferences
* **Path**: `/users/{userId}/settings/preferences`
* **Purpose**: User configuration synced across devices.
* **Fields**:
  * `timeFilter` (*string*): Default ledger cadence (`"7"`, `"30"`, `"90"`, `"salary"`, or `"all"`).
  * `salaryDay` (*number*): Day of month for salary pay cycle calculations (1–31).
  * `salaryLog` (*array*): Historical salary credit dates and values.
  * `lastSeenRelease` (*string, optional*): Version ID of the last acknowledged in-app release note modal.
  * `emailSubscriptions` (*map*): Digest notification flags (`expenses`, `portfolio`, `subscriptions`).
  * `updatedAt` (*number*): Timestamp of last preference change.

### 3.6. Watchlists
* **Path**: `/users/{userId}/watchlists/default`
* **Purpose**: Unified media collection (movies, TV shows, anime, books).
* **Storage Model**: Bucketed map of items indexed by UUID.
* **Fields**:
  * `items` (*map of objects*): Keyed by item UUID.
    * `title` (*string*): Title of media entry.
    * `type` (*string*): `"movie"`, `"show"`, `"anime"`, or `"book"`.
    * `status` (*string*): `"plan_to_watch"`, `"watching"`, `"completed"`, `"paused"`, or `"dropped"`.
    * `progress` (*number*): Current progress (episodes or chapters completed).
    * `totalEpisodes` (*number, optional*): Total available episodes.
    * `rating` (*number, optional*): User rating (1–10).
    * `coverImage` (*string, optional*): Poster or cover art URL.
    * `year` (*number, optional*): Release year.
    * `traktId` (*number, optional*): Trakt.tv external reference ID.
    * `anilistId` (*number, optional*): AniList external reference ID.
    * `createdAt` (*number*): Timestamp when added.
    * `updatedAt` (*number*): Timestamp when last modified.

---

## 4. Security Rules Configuration

All client access routes through the Firestore REST API using the caller's verified Firebase Auth token. Security is enforced by `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    function isEncrypted(val) {
      return val is string && val.matches('^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$');
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /expenses/{expenseId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId)
                              && isEncrypted(request.resource.data.title);
      }

      match /subscriptions/{subscriptionId} {
        allow read, write: if isOwner(userId);
      }

      match /portfolio/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /settings/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /watchlists/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /recommendations/{docId} {
        allow read, write: if isOwner(userId);

        match /{subDoc=**} {
          allow read, write: if isOwner(userId);
        }
      }
    }

    match /watchlists/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /settings/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /recommendations/{userId} {
      allow read, write: if isOwner(userId);

      match /entries/{entryId} {
        allow read, write: if isOwner(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 5. Indexing & Storage Optimization

Firestore automatically creates ascending and descending single-field indexes for every field in every document by default. Because Continuum encrypts sensitive values with random initialization vectors, B-tree indexes on ciphertext fields waste database storage and slow down writes.

`firestore.indexes.json` explicitly overrides and disables indexing on ciphertext fields:

```json
{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "expenses",
      "fieldPath": "title",
      "indexes": []
    },
    {
      "collectionGroup": "expenses",
      "fieldPath": "category",
      "indexes": []
    },
    {
      "collectionGroup": "expenses",
      "fieldPath": "notes",
      "indexes": []
    },
    {
      "collectionGroup": "expenses",
      "fieldPath": "amount",
      "indexes": []
    },
    {
      "collectionGroup": "portfolio",
      "fieldPath": "assets",
      "indexes": []
    },
    {
      "collectionGroup": "portfolio",
      "fieldPath": "valuationHistory",
      "indexes": []
    }
  ]
}
```

---

## 6. Self-Host Deployment Commands

Deploy both rules and index overrides to your Firebase project using the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use <your-firebase-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 7. Migration from Legacy Flat Collections

For existing deployments created on earlier versions of Continuum Home, a zero-downtime migration engine is included:

1. **Dual-Read Compatibility**: Repositories automatically query `/users/{uid}/...` subcollections first, falling back to legacy root collections (`/expenses`, `/subscriptions`, etc.) if documents have not yet been migrated.
2. **Executing the Schema Migration**:
   * **Via Admin UI**: Navigate to `/admin`, locate the **Quick Operations** deck, and click **Migrate Schema to Subcollections**.
   * **Via API**: Issue an authenticated POST request:
     ```bash
     curl -X POST https://<your-domain>/api/admin/migrate-schema \
       -H "Authorization: Bearer <firebase-id-token>" \
       -H "Content-Type: application/json" \
       -d '{"dryRun": false}'
     ```
3. **Pruning Legacy Records**:
   Once you verify that data is reading from subcollections, clean up the obsolete top-level collections:
   ```bash
   curl -X POST https://<your-domain>/api/admin/migrate-schema \
     -H "Authorization: Bearer <firebase-id-token>" \
     -H "Content-Type: application/json" \
     -d '{"prune": true}'
   ```
