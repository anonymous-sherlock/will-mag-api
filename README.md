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

## P 👥 Enhanced User Features

- [ ] GET /api/v1/profile/{id}/stats
- [ ] GET /api/v1/profile/{id}/achievements

---

## P 🎡 Spin Wheel Feature

- [ ] POST /api/v1/spin-wheel/spin
- [ ] GET /api/v1/spin-wheel/prizes
- [ ] GET /api/v1/spin-wheel/history
- [ ] POST /api/v1/spin-wheel/claim-prize
- [ ] GET /api/v1/spin-wheel/daily-spin
- [ ] POST /api/v1/spin-wheel/share-bonus
