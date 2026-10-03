import { express } from "@neomaventures/mocks"
import { Test } from "@nestjs/testing"
import { type Request, type Response } from "express"

import { RequestContextMiddleware } from "./request-context.middleware"

import { getRequest, RequestContextModule } from "./index"

describe("RequestContextMiddleware", () => {
  let middleware: RequestContextMiddleware

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    middleware = module.get(RequestContextMiddleware)
  })

  describe("Given an incoming request", () => {
    describe("When use() runs the downstream stack", () => {
      it("Then getRequest() inside next() returns that request", () => {
        const request = express.request() as unknown as Request
        let seenInNext: Request | undefined

        middleware.use(request, {} as Response, () => {
          seenInNext = getRequest()
        })

        expect(seenInNext).toBe(request)
      })
    })
  })

  describe("Given the downstream stack has completed", () => {
    describe("When getRequest() is called outside the run() callback", () => {
      it("Then the request does not leak out of the context", () => {
        const request = express.request() as unknown as Request

        middleware.use(request, {} as Response, () => {})

        expect(getRequest()).toBeUndefined()
      })
    })
  })
})
