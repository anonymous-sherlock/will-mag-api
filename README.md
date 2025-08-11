# Swing Mag API

## Setup

Clone this repo

Create `.env` file

```sh
cp .env.example .env
```

Install dependencies

```sh
pnpm install
```

Create mysql db / push schema

```sh
pnpm db:push
```

Run

```sh
pnpm dev
```

Lint

```sh
pnpm lint
```

Test

```sh
pnpm test
```

## Tasks

**Get Latest Votes**

- [x] Implement endpoint to fetch a list of the latest votes.
- [x] Return voter and votee details (profile id, names, images).
- [x] Include votee property for total votes received.
- [x] Ensure admin authentication for this endpoint.
- [x] add a pagination to this api.

**Get All Payments**

- [x] Remove unnecessary details from the payment data (only include essential fields).
- [x] Ensure admin authentication for this endpoint.

- [ ] **Assign Global Ranks to Profiles**
  - [ ] **Top 20 Ranks (Manual by Admin)**
    - [ ] Create endpoint for admin to assign ranks **1–20** manually.
    - [ ] Validate no duplicate ranks in top 20.
    - [ ] Ensure only admin users can perform this action.
    - [ ] Store ranks in `Profile` table (new `rank` field,`isRankLocked` field).
    - [ ] Log all rank updates for audit history.

  - [ ] **Ranks 21+ (Automatic by Votes)**
    - [ ] Calculate total score for each profile:
      - Paid votes → higher weight (e.g., 2 points each).
      - Free votes → lower weight (e.g., 1 point each).
    - [ ] Sort all non-top-20 profiles by score (desc).
    - [ ] Assign ranks starting from 21 automatically.

## P 🗂️ Media/File Management

- [ ] POST /api/v1/media/upload
- [ ] GET /api/v1/media/{id}
- [ ] DELETE /api/v1/media/{id}
- [x] POST /api/v1/profile/{id}/photos
- [x] DELETE /api/v1/profile/{id}/photos/{photoId}

---

## P 🏆 Enhanced Contest Features

- [x] GET /api/v1/contest/{id}/leaderboard
- [x] GET /api/v1/contest/{id}/stats

---

## P 💳 Payment & Subscription System

- [x] GET /api/v1/payments/history

---

## P 👥 Enhanced User Features

- [ ] GET /api/v1/users/{id}/stats
- [ ] GET /api/v1/users/{id}/achievements
- [ ] POST /api/v1/users/{id}/follow
- [ ] DELETE /api/v1/users/{id}/follow
- [ ] GET /api/v1/users/{id}/followers
- [ ] GET /api/v1/users/{id}/following

---

## P 📊 Analytics & Reporting

- [ ] GET /api/v1/analytics/contest/{id}
- [ ] GET /api/v1/analytics/user/{id}
- [ ] GET /api/v1/analytics/platform
- [ ] POST /api/v1/reports/create
- [ ] GET /api/v1/reports/{id}

---

## P 🎡 Spin Wheel Feature

- [ ] POST /api/v1/spin-wheel/spin
- [ ] GET /api/v1/spin-wheel/prizes
- [ ] GET /api/v1/spin-wheel/history
- [ ] POST /api/v1/spin-wheel/claim-prize
- [ ] GET /api/v1/spin-wheel/daily-spin
- [ ] POST /api/v1/spin-wheel/share-bonus

---

## P 🗳️ Enhanced Voting System

- [ ] GET /api/v1/votes/analytics
- [x] GET /api/v1/votes/leaderboard
