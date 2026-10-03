import { express } from "@neomaventures/mocks"
import { Test } from "@nestjs/testing"
import { type Request, type Response } from "express"
import { ClsService } from "nestjs-cls"

import { RequestContextMiddleware } from "./request-context.middleware"

import { getRequest, RequestContextModule } from "./index"

describe("getRequest", () => {
  let middleware: RequestContextMiddleware
  let cls: ClsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    middleware = module.get(RequestContextMiddleware)
    cls = module.get(ClsService)
  })

  describe("Given the boundary has stored the request in an active context", () => {
    describe("When getRequest() is called inside that context", () => {
      it("Then it returns the stored request", async () => {
        const request = express.request() as unknown as Request
        await new Promise<void>((resolve) => {
          middleware.use(request, {} as Response, () => {
            expect(getRequest()).toBe(request)
            resolve()
          })
        })
      })
    })
  })

  describe("Given an active context with no request stored", () => {
    describe("When getRequest() is called", () => {
      it("Then it returns undefined", () => {
        expect(cls.run(() => getRequest())).toBeUndefined()
      })
    })
  })

  describe("Given no active request context", () => {
    describe("When getRequest() is called off-context", () => {
      it("Then it returns undefined", () => {
        expect(getRequest()).toBeUndefined()
      })
    })
  })
})
