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

- [ ] Integrate Stripe
- [ ] Write logic to pay for extra votes
- [ ] Update users api to use better auth
- [ ] Write logic to get top 10 users with the highest votes
- [ ] Write logic to get the latest 20 votes
- [ ] Write logic to implement prize history (previous winners of a contest)
- [ ] Secure apis with authentication middleware
- [ ] RBAC on apis
