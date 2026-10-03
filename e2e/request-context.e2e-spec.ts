import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

const { CREATED, OK } = HttpStatus

describe("getRequest()", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance<App>>>

  beforeEach(async () => {
    app = await managedAppInstance<App>("e2e/app/app.module.ts#AppModule")
  })

  describe("Given a request is made with a body", () => {
    describe("When a default-scoped provider reads the request", () => {
      it("Then the response echoes what the provider read", async () => {
        const marker = faker.string.uuid()

        await request(app.getHttpServer())
          .post("/echo")
          .send({ marker })
          .expect(CREATED)
          .expect(({ body }) => expect(body).toEqual({ body: { marker } }))
      })
    })
  })

  describe("Given two concurrent requests with different bodies", () => {
    describe("When each handler's default-scoped provider reads its request", () => {
      it("Then each response carries only its own body — never the other's", async () => {
        const [a, b] = await Promise.all([
          request(app.getHttpServer()).post("/echo/slow").send({ marker: "A" }),
          request(app.getHttpServer()).post("/echo/slow").send({ marker: "B" }),
        ])

        expect(a.status).toBe(CREATED)
        // TODO(max-expects#317): assertion targets same subject; consider consolidation
        // eslint-disable-next-line jest/max-expects
        expect(b.status).toBe(CREATED)
        // TODO(max-expects#317): assertion targets same subject; consider consolidation
        // eslint-disable-next-line jest/max-expects
        expect(a.body).toEqual({ marker: "A" })
        // TODO(max-expects#317): assertion targets same subject; consider consolidation
        // eslint-disable-next-line jest/max-expects
        expect(b.body).toEqual({ marker: "B" })
      })
    })
  })
})

describe("createContextSlot()", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance<App>>>

  beforeEach(async () => {
    app = await managedAppInstance<App>("e2e/app/app.module.ts#AppModule")
  })

  describe("Given a request with the x-profile-name header", () => {
    describe("When the profile is read via get() accessor", () => {
      it("should return the profile name", async () => {
        const name = faker.person.firstName()

        await request(app.getHttpServer())
          .get("/echo/profile/get")
          .set("x-profile-name", name)
          .expect(OK)
          .expect(({ body }) => expect(body).toEqual({ name }))
      })
    })

    describe("When the profile is read via @Inject(CurrentProfile)", () => {
      it("should return the profile name", async () => {
        const name = faker.person.firstName()

        await request(app.getHttpServer())
          .get("/echo/profile/inject")
          .set("x-profile-name", name)
          .expect(OK)
          .expect(({ body }) => expect(body).toEqual({ name }))
      })
    })

    describe("When the profile is read via @ProfileParam() decorator", () => {
      it("should return the profile name", async () => {
        const name = faker.person.firstName()

        await request(app.getHttpServer())
          .get("/echo/profile/param")
          .set("x-profile-name", name)
          .expect(OK)
          .expect(({ body }) => expect(body).toEqual({ name }))
      })
    })
  })

  describe("Given a request without the x-profile-name header", () => {
    describe("When the profile is read via get() accessor", () => {
      it("should return undefined for name", async () => {
        await request(app.getHttpServer())
          .get("/echo/profile/get")
          .expect(OK)
          .expect(({ body }) => expect(body).toEqual({}))
      })
    })
  })

  describe("Given two concurrent requests with different profile names", () => {
    const nameA = faker.person.firstName()
    const nameB = faker.person.firstName()

    describe("When both read the profile via get() accessor", () => {
      it("should let request A see its own profile name", async () => {
        await Promise.all([
          request(app.getHttpServer())
            .get("/echo/profile/get")
            .set("x-profile-name", nameA)
            .expect(OK)
            .expect({ name: nameA }),
          request(app.getHttpServer())
            .get("/echo/profile/get")
            .set("x-profile-name", nameB),
        ])
      })

      it("should let request B see its own profile name", async () => {
        await Promise.all([
          request(app.getHttpServer())
            .get("/echo/profile/get")
            .set("x-profile-name", nameA),
          request(app.getHttpServer())
            .get("/echo/profile/get")
            .set("x-profile-name", nameB)
            .expect(OK)
            .expect({ name: nameB }),
        ])
      })
    })
  })
})
