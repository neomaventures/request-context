import { type Request } from "express"

import { createContextSlot } from "./context-slot/create-context-slot"

/**
 * Internal slot for the live HTTP request. The `param`, `token`, and `provider`
 * forms are intentionally not exported -- the request is stored for deep reads
 * via {@link getRequest}, not for DI injection (use `@Req()` at the controller
 * boundary instead).
 */
const requestSlot = createContextSlot<Request>(
  "@neomaventures/request-context:request",
)

/**
 * Read the HTTP request currently being handled, from anywhere below the
 * controller boundary -- deep services, repositories, TypeORM listeners -- with
 * no `@Req()`, no `Scope.REQUEST`, and no constructor injection of `REQUEST`.
 *
 * Resolves the request out of the per-request `AsyncLocalStorage` context
 * opened by `RequestContextModule`. Returns `undefined` when called outside any
 * request (e.g. at bootstrap, in a script, or in a background job) -- it never
 * throws.
 *
 * @returns The live request being handled, or `undefined` outside a request.
 *
 * @example Read the request deep in a singleton service
 * ```typescript
 * @Injectable()
 * export class AuditService {
 *   record(): void {
 *     const userId = getRequest()?.headers["x-user-id"]
 *     // ...
 *   }
 * }
 * ```
 */
export const getRequest: () => Request | undefined = requestSlot.get

/**
 * Store the live request in the current ALS context. Internal -- the boundary
 * middleware is the only caller, writing once per request inside its
 * `cls.run()`. Deliberately kept out of `index.ts` so consumers can't bypass
 * the boundary; if a non-HTTP entry point (e.g. a queue consumer) ever needs
 * to establish a context manually, promote it then -- paired with a
 * `runWithRequest()` helper that bundles `cls.run()` + `setRequest()` so
 * callers can't get the order wrong.
 *
 * @param req The HTTP request to store for the lifetime of the current context.
 */
export const setRequest: (req: Request) => void = requestSlot.set
