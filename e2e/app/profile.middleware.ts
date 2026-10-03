import { Injectable, type NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"

import { setProfile } from "./profile-slot"

/**
 * Reads the `x-profile-name` header and stores a {@link Profile} in the
 * request context via the test profile slot. Simulates what a real consumer
 * package's middleware (e.g. auth) would do.
 */
@Injectable()
export class ProfileMiddleware implements NestMiddleware {
  public use(req: Request, _res: Response, next: NextFunction): void {
    const name = req.headers["x-profile-name"]
    if (typeof name === "string") {
      setProfile({ name })
    }
    next()
  }
}
