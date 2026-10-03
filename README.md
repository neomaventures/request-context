# @neomaventures/request-context

Per-request context (AsyncLocalStorage) for NestJS — read the current request anywhere below the controller, no request scope.

[![npm version](https://img.shields.io/npm/v/%40neomaventures%2Frequest-context)](https://www.npmjs.com/package/@neomaventures/request-context)
[![CI](https://github.com/neomaventures/request-context/actions/workflows/ci.yml/badge.svg)](https://github.com/neomaventures/request-context/actions/workflows/ci.yml)

## Installation

```bash
npm install @neomaventures/request-context
```

## Usage

Import `RequestContextModule.forRoot()` once in your root module. It opens one
`AsyncLocalStorage` context per request, so the live request is reachable from
anywhere in the call stack.

```typescript
import { RequestContextModule } from "@neomaventures/request-context"
import { Module } from "@nestjs/common"

@Module({
  imports: [RequestContextModule.forRoot()],
})
export class AppModule {}
```

`forRoot()` takes no options.

### Reading the request

Call `getRequest()` anywhere below the controller boundary — in a plain
singleton service, a repository, a TypeORM listener — with no `@Req()`, no
`Scope.REQUEST`, and no threading `req` through your call stack.

```typescript
import { getRequest } from "@neomaventures/request-context"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AuditService {
  record(): void {
    const request = getRequest()
    const userId = request?.headers["x-user-id"]
    // ...
  }
}
```

`getRequest()` returns the live request being handled, or `undefined` when
called outside any request (at bootstrap, in a script, or in a background job).
It never throws. Concurrent requests are fully isolated — each call site sees
its own request.

### Creating context slots

Use `createContextSlot<T>(key)` to define a typed, per-request value that
consumer packages can read via three forms: a plain accessor, a param
decorator, and constructor injection.

```typescript
import { createContextSlot } from "@neomaventures/request-context"

interface Principal {
  id: string
  email: string
}

const principalSlot = createContextSlot<Principal>("@acme/auth:principal")

// Plain accessor — works anywhere, no DI required
export const getPrincipal = principalSlot.get

// Writer — called by your middleware to store the value
export const setPrincipal = principalSlot.set

// Param decorator — use in controller method signatures
export const Principal = principalSlot.param

// Injection token — use with @Inject() in constructors
export const CurrentPrincipal = principalSlot.token

// Provider — register in your module's providers array
export const principalProvider = principalSlot.provider
```

#### Plain accessor (`get` / `set`)

The `get` accessor reads from `AsyncLocalStorage` via the static CLS handle.
It works anywhere — services, repositories, TypeORM listeners, utility
functions — with no DI wiring. Returns `undefined` outside a request context.

```typescript
import { getPrincipal } from "./auth/principal-slot"

const principal = getPrincipal()
const userId = principal?.id
```

The `set` writer is typically called once by the consumer package's middleware
to store the value at the request boundary.

#### Param decorator (`param`)

Use in controller method parameters, just like `@Body()` or `@Param()`:

```typescript
@Get("profile")
public getProfile(@Principal() principal: Principal): Principal {
  return principal
}
```

#### Constructor injection (`token` / `provider`)

Register the provider in your module, then inject with `@Inject(token)`:

```typescript
// In your module
@Module({
  providers: [principalProvider],
  exports: [CurrentPrincipal],
})
export class AuthModule {}

// In any service
@Injectable()
export class BillingService {
  public constructor(
    @Inject(CurrentPrincipal) private readonly principal: Principal,
  ) {}
}
```

The injected value is a transparent proxy that resolves to the per-request
stored object. Concurrent requests are fully isolated.

> **Note:** The proxy delegates property access to the underlying object, so it
> works for object types. For primitive values (string, number), use the plain
> `get` accessor instead.

## Testing

In production `RequestContextMiddleware` opens a context on every incoming
request. In a unit spec there is no middleware, so any code that touches a
context slot has no context to read or write — `set` throws `NoContextError`
and `get` returns `undefined`.

The `./testing` subpath provides the seam. It needs no Nest container, no
`RequestContextModule` and no middleware:

```typescript
import { runInRequestContext } from "@neomaventures/request-context/testing"

import { getPrincipal, setPrincipal } from "./auth/principal-slot"

it("reads the principal stored for the request", async () => {
  await runInRequestContext(async () => {
    setPrincipal(principal)

    expect(getPrincipal()).toBe(principal)
  })
})
```

It returns whatever the callback returns, so you can assert on the result
instead:

```typescript
const principal = await runInRequestContext(async () => {
  setPrincipal(stored)
  return getPrincipal()
})
```

The context closes when the callback resolves — a slot write after it throws
`NoContextError`. Concurrent calls each get their own context, so parallel
specs never see each other's values.

Reach for this rather than `nestjs-cls` directly; `ClsServiceManager` is an
implementation detail this package owns.

## License

MIT
