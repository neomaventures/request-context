import { Injectable, type NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"
import { ClsService } from "nestjs-cls"

import { setRequest } from "./request-context.facade"

/**
 * The single request-context boundary. Opens one `AsyncLocalStorage` context
 * per request via `cls.run()` (never `enterWith()`, which is leak-prone) and
 * stores the live request inside it before calling `next()`.
 *
 * Because `run()` wraps `next()`, the entire downstream async tree —
 * controllers, deep singletons, listeners — shares this context, and it is
 * garbage-collected when the request's async tree completes. The request is
 * never stashed on a singleton, so concurrent requests stay isolated.
 *
 * Mounted on all routes by {@link RequestContextModule}.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  public constructor(private readonly cls: ClsService) {}

  public use(req: Request, _res: Response, next: NextFunction): void {
    this.cls.run(() => {
      setRequest(req)
      next()
    })
  }
}
