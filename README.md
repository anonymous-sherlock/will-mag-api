# Hono Open API Starter

Building fully documented type-safe JSON APIs with Hono and Open API.

- [Hono Open API Starter](#hono-open-api-starter)
  - [Included](#included)
  - [Setup](#setup)
  - [Code Tour](#code-tour)
  - [Endpoints](#endpoints)
  - [References](#references)

## Included

- Structured logging with [pino](https://getpino.io/) / [hono-pino](https://www.npmjs.com/package/hono-pino)
- Documented / type-safe routes with [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- Interactive API documentation with [scalar](https://scalar.com/#api-docs) / [@scalar/hono-api-reference](https://github.com/scalar/scalar/tree/main/packages/hono-api-reference)
- Convenience methods / helpers to reduce boilerplate with [stoker](https://www.npmjs.com/package/stoker)
- Type-safe schemas and environment variables with [zod](https://zod.dev/)
- Sensible editor, formatting and linting settings with [@antfu/eslint-config](https://github.com/antfu/eslint-config)

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

## Code Tour

Base hono app exported from [app.ts](./src/app.ts). Local development uses [@hono/node-server](https://hono.dev/docs/getting-started/nodejs) defined in [index.ts](./src/index.ts) - update this file or create a new entry point to use your preferred runtime.

Typesafe env defined in [env.ts](./src/env.ts) - add any other required environment variables here. The application will not start if any required environment variables are missing

See [src/routes/tasks](./src/routes/users/) for an example Open API group. Copy this folder / use as an example for your route groups.

- Router created in [tasks.index.ts](./src/routes/users/user.index.ts)
- Route definitions defined in [tasks.routes.ts](./src/routes/users/user.routes.ts)
- Hono request handlers defined in [tasks.handlers.ts](./src/routes/users/user.handlers.ts)

All app routes are grouped together and exported into single type as `AppType` in [app.ts](./src/app.ts) for use in [RPC / hono/client](https://hono.dev/docs/guides/rpc).

## Endpoints

| Path               | Description              |
| ------------------ | ------------------------ |
| GET /api/v1/doc    | Open API Specification   |
| GET /reference     | Scalar API Documentation |
| GET /api/v1/users  | List all users           |
| POST /api/v1/users | Create a user            |

## References

- [What is Open API?](https://swagger.io/docs/specification/v3_0/about/)
- [Hono](https://hono.dev/)
  - [Zod OpenAPI Example](https://hono.dev/examples/zod-openapi)
  - [Testing](https://hono.dev/docs/guides/testing)
  - [Testing Helper](https://hono.dev/docs/helpers/testing)
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [Scalar Documentation](https://github.com/scalar/scalar/tree/main/?tab=readme-ov-file#documentation)
  - [Themes / Layout](https://github.com/scalar/scalar/blob/main/documentation/themes.md)
  - [Configuration](https://github.com/scalar/scalar/blob/main/documentation/configuration.md)
