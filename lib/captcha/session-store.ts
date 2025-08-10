import { v4 as uuidv4 } from "uuid"

export type CaptchaSession = {
  id: string
  createdAt: number
  court: string
  demo: boolean
  formPageUrl: string
  cookieHeader?: string
  viewState?: string
  eventValidation?: string
  viewStateGenerator?: string
  captchaUrl?: string
}

const SESSIONS = new Map<string, CaptchaSession>()
const TTL_MS = 10 * 60 * 1000 // 10 minutes

function cleanup() {
  const now = Date.now()
  for (const [k, v] of SESSIONS.entries()) {
    if (now - v.createdAt > TTL_MS) {
      SESSIONS.delete(k)
    }
  }
}

export function createCaptchaSession(init: Omit<CaptchaSession, "id" | "createdAt">): string {
  cleanup()
  const id = uuidv4()
  const session: CaptchaSession = { id, createdAt: Date.now(), ...init }
  SESSIONS.set(id, session)
  return id
}

export function getCaptchaSession(id: string): CaptchaSession | undefined {
  cleanup()
  return SESSIONS.get(id)
}

export function deleteCaptchaSession(id: string) {
  SESSIONS.delete(id)
}
