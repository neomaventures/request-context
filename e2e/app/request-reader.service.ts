import { Injectable } from "@nestjs/common"

import { getRequest } from "@neomaventures/request-context"

/**
 * A plain, default-scope (singleton) service that reads the current request
 * deep in the call stack via `getRequest()` — no `@Req()`, no `Scope.REQUEST`,
 * no constructor injection of `REQUEST`.
 *
 * Because it is a singleton, the same instance serves every concurrent request;
 * it must never stash the request. Each call reads the live request out of the
 * per-request ALS context. This is the de-request-scoping the package proves.
 */
@Injectable()
export class RequestReaderService {
  /** Read the body off the live request, deep in the call stack. */
  public readBody(): unknown {
    return getRequest()?.body
  }

  /**
   * Await a short delay, then read the body off the live request. The delay is
   * long enough that two concurrent requests both enter this method before
   * either resumes — so they genuinely interleave. That proves the read is
   * isolated per request, not a stash of "the last request seen": a singleton
   * that stashed the request would return the second request's body to both.
   */
  public async readBodyAfterDelay(): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return getRequest()?.body
  }
}
