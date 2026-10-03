import { ClsServiceManager } from "nestjs-cls"

/**
 * Runs `fn` inside an active `nestjs-cls` request context so context-slots
 * (values written via `createContextSlot`) can be read and written.
 *
 * In production the `RequestContextMiddleware` opens the context on every
 * incoming request; in unit specs there is no middleware, so any code that
 * touches a context-slot must be run inside `runInRequestContext`. This is
 * the test-time entry point — consumers should never reach for `nestjs-cls`
 * directly.
 *
 * @param fn - The async function to run inside the request context.
 * @returns Whatever `fn` returns.
 *
 * @example Read/write a slot in a unit spec
 * ```typescript
 * import { runInRequestContext } from "@neomaventures/request-context/testing"
 * import { setAccount, getAccount } from "./auth/account-slot"
 *
 * await runInRequestContext(async () => {
 *   setAccount(account)
 *   expect(getAccount()).toBe(account)
 * })
 * ```
 */
export const runInRequestContext = async <T>(
  fn: () => Promise<T>,
): Promise<T> => {
  return ClsServiceManager.getClsService().run(fn)
}
