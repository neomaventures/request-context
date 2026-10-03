import {
  type DynamicModule,
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common"
import { ClsModule } from "nestjs-cls"

import { RequestContextMiddleware } from "./request-context.middleware"

/**
 * Per-request context for NestJS, backed by `AsyncLocalStorage` via
 * `nestjs-cls`. Import `RequestContextModule.forRoot()` once in your root
 * module to open one context per request; then call {@link getRequest} anywhere
 * below the controller boundary to read the live request — no `@Req()`, no
 * `Scope.REQUEST`, no threading `req` through your call stack.
 *
 * `forRoot()` takes no options: there is nothing to configure in this version,
 * so it is intentionally hand-rolled rather than built with
 * `ConfigurableModuleBuilder`, and there is no `forRootAsync`.
 *
 * @example Mount once at the root
 * ```typescript
 * @Module({
 *   imports: [RequestContextModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class RequestContextModule implements NestModule {
  /**
   * Wire the request-context boundary into your application.
   *
   * Imports `ClsModule.forRoot()` (global, so `ClsService` is injectable
   * app-wide and the static handle resolves everywhere) without mounting cls's
   * own middleware — {@link RequestContextMiddleware} is the single context
   * boundary.
   *
   * @returns A dynamic module to add to your root module's `imports`.
   *
   * @example
   * ```typescript
   * imports: [RequestContextModule.forRoot()]
   * ```
   */
  public static forRoot(): DynamicModule {
    return {
      module: RequestContextModule,
      global: true,
      imports: [
        ClsModule.forRoot({ global: true, middleware: { mount: false } }),
      ],
      providers: [RequestContextMiddleware],
    }
  }

  /**
   * Mounts the boundary middleware on every route so each request runs inside
   * its own `AsyncLocalStorage` context.
   */
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*")
  }
}
