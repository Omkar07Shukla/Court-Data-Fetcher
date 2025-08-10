import type { NextRequest } from "next/server"
import { getCaptchaSession } from "@/lib/captcha/session-store"

/**
 * Proxies the CAPTCHA image for a given session ID.
 * GET /api/captcha/image?sid=...
 */
export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid")
  if (!sid) {
    return new Response("Missing sid", { status: 400 })
  }
  const session = getCaptchaSession(sid)
  if (!session) {
    return new Response("Invalid or expired session", { status: 404 })
  }

  // Demo: serve local fixture image
  if (session.demo) {
    try {
      const localRes = await fetch(new URL(session.captchaUrl || "/fixtures/captcha-demo.png", req.url), {
        cache: "no-store",
      })
      const buf = await localRes.arrayBuffer()
      const ct = localRes.headers.get("content-type") || "image/png"
      return new Response(buf, { headers: { "Content-Type": ct, "Cache-Control": "no-store" } })
    } catch {
      return new Response("Failed to serve demo captcha", { status: 500 })
    }
  }

  // Live: fetch the image with cookies if present
  if (!session.captchaUrl) {
    return new Response("CAPTCHA URL missing", { status: 500 })
  }

  try {
    const res = await fetch(session.captchaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CourtDataFetcher/1.0; +https://example.com)",
        ...(session.cookieHeader ? { Cookie: session.cookieHeader } : {}),
        Referer: session.formPageUrl,
      },
      cache: "no-store",
    })
    if (!res.ok) {
      return new Response("Failed to fetch captcha image", { status: 502 })
    }
    const ct = res.headers.get("content-type") || "image/png"
    const buf = await res.arrayBuffer()
    return new Response(buf, { headers: { "Content-Type": ct, "Cache-Control": "no-store" } })
  } catch (e: any) {
    return new Response(e?.message || "Captcha image proxy failed", { status: 500 })
  }
}
