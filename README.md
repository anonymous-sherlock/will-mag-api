# Will Mag API

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

## P 🗂️ Media/File Management

- [ ] POST /api/v1/media/upload
- [ ] GET /api/v1/media/{id}
- [ ] DELETE /api/v1/media/{id}
- [ ] POST /api/v1/profile/{id}/photos
- [ ] DELETE /api/v1/profile/{id}/photos/{photoId}

---

## P 🏆 Enhanced Contest Features

- [ ] GET /api/v1/contest/{id}/leaderboard
- [ ] GET /api/v1/contest/{id}/stats

---

## P 💳 Payment & Subscription System

- [ ] GET /api/v1/payments/history

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
- [ ] GET /api/v1/votes/leaderboard
