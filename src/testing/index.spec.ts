import { faker } from "@faker-js/faker"

import { createContextSlot, NoContextError } from "../index"

import { runInRequestContext } from "./index"

interface TestProfile {
  name: string
}

describe("runInRequestContext", () => {
  let slot: ReturnType<typeof createContextSlot<TestProfile>>

  beforeEach(() => {
    slot = createContextSlot<TestProfile>("@test:run-in-request-context")
  })

  describe("Given no Nest container has been built", () => {
    describe("When a slot is written inside the callback", () => {
      it("Then the value reads back without any middleware or DI", async () => {
        const profile = { name: faker.person.firstName() }

        const result = await runInRequestContext(async () => {
          slot.set(profile)
          return slot.get()
        })

        expect(result).toBe(profile)
      })
    })

    describe("When the callback returns a value", () => {
      it("Then that value is passed through to the caller", async () => {
        const marker = faker.string.uuid()

        await expect(runInRequestContext(async () => marker)).resolves.toBe(
          marker,
        )
      })
    })
  })

  describe("Given the callback has completed", () => {
    describe("When a slot is written outside the callback", () => {
      it("Then the context has closed and the write is rejected", async () => {
        await runInRequestContext(async () => {
          slot.set({ name: faker.person.firstName() })
        })

        expect(() => slot.set({ name: faker.person.firstName() })).toThrow(
          NoContextError,
        )
      })
    })
  })

  describe("Given two callbacks running concurrently", () => {
    describe("When each writes its own value to the same slot", () => {
      it("Then neither sees the other's value", async () => {
        const read = async (name: string): Promise<TestProfile | undefined> =>
          runInRequestContext(async () => {
            slot.set({ name })
            await new Promise((resolve) => setTimeout(resolve, 10))
            return slot.get()
          })

        const [a, b] = await Promise.all([read("A"), read("B")])

        expect(a).toEqual({ name: "A" })
        // eslint-disable-next-line jest/max-expects
        expect(b).toEqual({ name: "B" })
      })
    })
  })
})
