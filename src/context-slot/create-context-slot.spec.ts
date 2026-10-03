import { faker } from "@faker-js/faker"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import {
  ContextSlotMutationError,
  NoContextError,
  ContextSlotPrimitiveError,
  type ContextSlot,
  RequestContextModule,
  createContextSlot,
} from "../index"

interface TestProfile {
  name: string
  age: number
  greet(): string
}

function fakeProfile(overrides?: Partial<TestProfile>): TestProfile {
  return {
    name: faker.person.firstName(),
    age: faker.number.int({ min: 18, max: 99 }),
    greet(): string {
      return `Hi, I'm ${this.name}`
    },
    ...overrides,
  }
}

describe("createContextSlot", () => {
  let cls: ClsService
  let slot: ContextSlot<TestProfile>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    cls = module.get(ClsService)
    slot = createContextSlot<TestProfile>("@test:profile")
  })

  describe("get()", () => {
    describe("Given an active context with a stored value", () => {
      it("should return the stored value", () => {
        const profile = fakeProfile()

        const result = cls.run(() => {
          slot.set(profile)
          return slot.get()
        })

        expect(result).toBe(profile)
      })
    })

    describe("Given an active context with no value stored", () => {
      it("should return undefined", () => {
        const result = cls.run(() => slot.get())
        expect(result).toBeUndefined()
      })
    })

    describe("Given no active context", () => {
      it("should return undefined", () => {
        expect(slot.get()).toBeUndefined()
      })
    })
  })

  describe("set()", () => {
    describe("Given an active context", () => {
      it("should store the value so get() can retrieve it", () => {
        const profile = fakeProfile()

        const result = cls.run(() => {
          slot.set(profile)
          return slot.get()
        })

        expect(result).toBe(profile)
      })
    })

    describe("Given no active context", () => {
      it("should throw NoContextError with the original error as cause", () => {
        let caught: unknown

        try {
          slot.set(fakeProfile())
        } catch (err) {
          caught = err
        }

        expect(caught).toBeInstanceOf(NoContextError)
        // TODO(max-expects#317): assertion targets same subject; consider consolidation
        // eslint-disable-next-line jest/max-expects
        expect((caught as NoContextError).cause).toBeInstanceOf(Error)
      })
    })
  })

  describe("provider (per-request proxy)", () => {
    describe("Given a value is stored and read through the provider proxy", () => {
      it("should resolve property access to the stored value", () => {
        const profile = fakeProfile()

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          expect(proxy).toMatchObject({
            name: profile.name,
            age: profile.age,
          })
        })
      })

      it("should bind methods to the stored value so this-references work", () => {
        const name = faker.person.firstName()
        const profile = fakeProfile({ name })

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          expect(proxy.greet()).toBe(`Hi, I'm ${name}`)
        })
      })

      it("should report true via 'in' for a property that exists on the stored value", () => {
        const profile = fakeProfile()

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          expect("name" in proxy).toBeTrue()
        })
      })

      it("should report false via 'in' for a property that does not exist on the stored value", () => {
        const profile = fakeProfile()

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          expect("nonexistent" in proxy).toBeFalse()
        })
      })

      it("should support Object.keys()", () => {
        const profile = fakeProfile()

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue
          expect(Object.keys(proxy as object)).toEqual(Object.keys(profile))
        })
      })

      it("should support spreading into a new object", () => {
        const profile = fakeProfile()

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          const spread = { ...proxy }
          expect(spread).toMatchObject({
            name: profile.name,
            age: profile.age,
          })
        })
      })

      it("should support JSON.stringify()", () => {
        const name = faker.person.firstName()
        const age = faker.number.int({ min: 18, max: 99 })
        const profile = fakeProfile({ name, age })

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue
          const parsed = JSON.parse(JSON.stringify(proxy)) as Record<
            string,
            unknown
          >
          expect(parsed).toEqual({ name, age })
        })
      })
    })

    describe("Given a property is assigned on the proxy", () => {
      it("should throw ContextSlotMutationError", () => {
        const profile = fakeProfile()

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          expect(() => {
            proxy.name = "mutated"
          }).toThrow(ContextSlotMutationError)
        })
      })
    })

    describe("Given no value is stored in the current context", () => {
      it("should return undefined for property access", () => {
        cls.run(() => {
          const proxy = slot.provider.useValue as TestProfile
          expect(proxy.name).toBeUndefined()
        })
      })

      it("should return false for the 'in' operator", () => {
        cls.run(() => {
          const proxy = slot.provider.useValue as TestProfile
          expect("name" in proxy).toBeFalse()
        })
      })

      it("should return an empty array for Object.keys()", () => {
        cls.run(() => {
          const proxy = slot.provider.useValue
          expect(Object.keys(proxy as object)).toEqual([])
        })
      })
    })

    describe("Given no active context", () => {
      it("should return undefined for property access", () => {
        const proxy = slot.provider.useValue as TestProfile
        expect(proxy.name).toBeUndefined()
      })
    })

    describe("Given a primitive value is stored in the slot", () => {
      it("should throw ContextSlotPrimitiveError on property access", () => {
        const primitiveSlot = createContextSlot<string>("@test:primitive")

        cls.run(() => {
          primitiveSlot.set("hello")
          const proxy = primitiveSlot.provider.useValue as unknown as string
          expect(() => {
            void (proxy as unknown as Record<string, unknown>).length
          }).toThrow(ContextSlotPrimitiveError)
        })
      })
    })
  })
})
