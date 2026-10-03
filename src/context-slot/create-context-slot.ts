import { type ValueProvider, createParamDecorator } from "@nestjs/common"
import { ClsServiceManager } from "nestjs-cls"

/**
 * The shape returned by {@link createContextSlot}. Each property is a different
 * "form" for accessing the same namespaced ALS value: a plain accessor, a
 * param decorator, an injection token, and a DI provider.
 *
 * @typeParam T - The type of the value stored in this slot.
 */
export interface ContextSlot<T> {
  /** Read the current value from the ALS store. Returns `undefined` outside a context. */
  get: () => T | undefined
  /** Write a value into the current ALS store under this slot's key. */
  set: (value: T) => void
  /** A function returning a `ParameterDecorator` that resolves to `get()` at request time. */
  param: () => ParameterDecorator
  /** A `Symbol` injection token for use with `@Inject()`. */
  token: symbol
  /**
   * A `ValueProvider` to register in the consumer module's `providers` array.
   *
   * The `useValue` is a transparent ES `Proxy` — a singleton object that
   * delegates every property access to the per-request value returned by
   * `get()`. This means a service injected with `@Inject(slot.token)` sees the
   * current request's value on every access, even though the service itself is
   * a singleton.
   *
   * The proxy is **read-only**: assigning to a property on the injected value
   * throws `ContextSlotMutationError`. Use `set()` at the request boundary
   * (middleware) to store values; consumers should treat the injected value as
   * immutable.
   *
   * Works for object-typed `T` only. For primitive slots (string, number), use
   * the `get` accessor instead.
   */
  provider: ValueProvider
}

/**
 * Thrown when consumer code attempts to assign a property on the injected
 * context-slot proxy. The proxy is a read-only view — mutations should go
 * through the slot's `set()` function at the request boundary.
 */
export class ContextSlotMutationError extends Error {
  public constructor(key: string, prop: string | symbol) {
    super(
      `Cannot mutate property "${String(prop)}" on context-slot proxy "${key}". ` +
        `Use the slot's set() function at the request boundary instead.`,
    )
    this.name = "ContextSlotMutationError"
  }
}

/**
 * Thrown when the proxy encounters a non-object value in the slot. The proxy
 * can only delegate property access to objects — primitive values (string,
 * number, boolean) should be read via the slot's `get()` accessor instead.
 */
export class ContextSlotPrimitiveError extends Error {
  public constructor(key: string, value: unknown) {
    super(
      `Context-slot proxy "${key}" received a primitive value (${typeof value}). ` +
        `The proxy provider only works with object types. Use the slot's get() accessor instead.`,
    )
    this.name = "ContextSlotPrimitiveError"
  }
}

/**
 * Thrown when `set()` is called outside an active request context. This means
 * `RequestContextModule.forRoot()` is either not imported or its middleware
 * has not yet run for this request.
 */
export class NoContextError extends Error {
  public constructor(key: string, cause?: unknown) {
    super(
      `Cannot set context-slot "${key}" — no active request context. ` +
        `Ensure RequestContextModule.forRoot() is imported in your root module ` +
        `and its middleware runs before the middleware that writes to this slot.`,
      { cause },
    )
    this.name = "NoContextError"
  }
}

/**
 * Create a typed context slot backed by a single namespaced key in the
 * per-request `AsyncLocalStorage` store. Returns all five forms a consumer
 * package needs to expose the value: a plain accessor (`get`/`set`), a
 * `@Param()` decorator, a DI injection token, and a provider to register.
 *
 * The slot is domain-agnostic -- `request-context` has no knowledge of what
 * the value represents. Each consumer package (e.g. your own `@acme/auth`)
 * calls this factory once, names its exports, and registers the provider in
 * its own module.
 *
 * @typeParam T - The type of the value stored in this slot.
 * @param key - A namespaced string key (e.g. `@acme/auth:principal`).
 * @returns A {@link ContextSlot} with all five access forms.
 *
 * @example Create a principal slot in an auth package
 * ```typescript
 * const principalSlot = createContextSlot<Authenticatable>("@acme/auth:principal")
 * export const getPrincipal      = principalSlot.get
 * export const setPrincipal      = principalSlot.set
 * export const Principal         = principalSlot.param
 * export const CurrentPrincipal  = principalSlot.token
 * export const principalProvider = principalSlot.provider
 * ```
 */
export function createContextSlot<T>(key: string): ContextSlot<T> {
  const get = (): T | undefined =>
    ClsServiceManager.getClsService().get(key) as T | undefined

  const set = (value: T): void => {
    try {
      ClsServiceManager.getClsService().set(key, value)
    } catch (cause) {
      throw new NoContextError(key, cause)
    }
  }

  const param = (): ParameterDecorator => createParamDecorator(() => get())()

  const token: symbol = Symbol(key)

  const target = {} as Record<string | symbol, unknown>

  const assertObject = (value: T): void => {
    if (typeof value !== "object" && typeof value !== "function") {
      throw new ContextSlotPrimitiveError(key, value)
    }
  }

  const proxy = new Proxy(target, {
    get(_target, prop): unknown {
      const value = get()
      if (value == null) return undefined
      assertObject(value)
      const result = (value as Record<string | symbol, unknown>)[prop]
      return typeof result === "function"
        ? (result as (...args: unknown[]) => unknown).bind(value)
        : result
    },
    set(_target, prop): never {
      throw new ContextSlotMutationError(key, prop)
    },
    has(_target, prop): boolean {
      const value = get()
      if (value == null) return false
      assertObject(value)
      return prop in (value as object)
    },
    ownKeys(): Array<string | symbol> {
      const value = get()
      if (value == null) return []
      assertObject(value)
      const keys = Reflect.ownKeys(value as object)
      for (const k of keys) {
        if (!Object.getOwnPropertyDescriptor(target, k)) {
          Object.defineProperty(target, k, {
            configurable: true,
            writable: true,
            value: undefined,
          })
        }
      }
      return keys
    },
    getPrototypeOf(): object | null {
      const value = get()
      if (value == null) return null
      assertObject(value)
      return Object.getPrototypeOf(value as object) as object | null
    },
    getOwnPropertyDescriptor(_target, prop): PropertyDescriptor | undefined {
      const value = get()
      if (value == null) return undefined
      assertObject(value)
      const desc = Object.getOwnPropertyDescriptor(value as object, prop)
      if (desc) {
        Object.defineProperty(target, prop, {
          ...desc,
          configurable: true,
        })
        return { ...desc, configurable: true }
      }
      return undefined
    },
  })

  const provider: ValueProvider = {
    provide: token,
    useValue: proxy,
  }

  return { get, set, param, token, provider }
}
