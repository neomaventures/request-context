import { Controller, Get, Inject, Post } from "@nestjs/common"

import {
  getProfile,
  CurrentProfile,
  type Profile,
  ProfileParam,
} from "./profile-slot"
import { RequestReaderService } from "./request-reader.service"

/**
 * Both POST endpoints delegate to the singleton {@link RequestReaderService},
 * which reads the live request deep in the call stack via `getRequest()`.
 * Nothing here threads `req` manually or uses `@Req()` -- the whole point is
 * that the live request is reachable from the context alone.
 *
 * The GET endpoints exercise the three context-slot access forms for the
 * test profile slot: plain accessor, `@Inject(token)`, and param decorator.
 */
@Controller("echo")
export class EchoController {
  public constructor(
    private readonly reader: RequestReaderService,
    @Inject(CurrentProfile) private readonly profile: Profile,
  ) {}

  /** Deep read: the singleton reads the live request and echoes its body. */
  @Post()
  public echo(): { body: unknown } {
    return { body: this.reader.readBody() }
  }

  /**
   * Isolation: the singleton awaits a short delay *before* reading, so two
   * concurrent requests interleave (both enter, both yield, both resume). A
   * "stash the last request" singleton returns the wrong marker here.
   */
  @Post("slow")
  public async slow(): Promise<{ marker: unknown }> {
    const body = (await this.reader.readBodyAfterDelay()) as
      { marker?: unknown } | undefined
    return { marker: body?.marker }
  }

  /** Read the profile via the plain accessor (`get()`). */
  @Get("profile/get")
  public profileViaGet(): { name: string | undefined } {
    return { name: getProfile()?.name }
  }

  /** Read the profile via `@Inject(CurrentProfile)`. */
  @Get("profile/inject")
  public profileViaInject(): { name: string | undefined } {
    return { name: this.profile?.name }
  }

  /** Read the profile via the param decorator. */
  @Get("profile/param")
  public profileViaParam(@ProfileParam() profile: Profile | undefined): {
    name: string | undefined
  } {
    return { name: profile?.name }
  }
}
