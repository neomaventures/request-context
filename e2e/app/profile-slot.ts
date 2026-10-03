import { createContextSlot } from "@neomaventures/request-context"

export interface Profile {
  name: string
}

const profileSlot = createContextSlot<Profile>("@test:profile")

export const getProfile = profileSlot.get
export const setProfile = profileSlot.set
export const ProfileParam = profileSlot.param
export const CurrentProfile = profileSlot.token
export const profileProvider = profileSlot.provider
