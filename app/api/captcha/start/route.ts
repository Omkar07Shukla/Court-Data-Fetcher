import { NextResponse } from "next/server"
import { createCaptchaSession } from "@/lib/captcha/session-store"
import * as cheerio from "cheerio"

/**
 * Starts a manual CAPTCHA session:
 * - For Demo Mode: returns a session that serves a local fixture CAPTCHA image
 * - For Live: fetches the court form page, extracts tokens and the CAPTCHA image URL, stores them in a session
 *
 * body: { court: string }
 * response: { ok: boolean, sid?: string, error?: string }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { court?: string }
    const court = body.court || "Delhi High Court"

    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"
    // 1) Demo mode: return a session that uses a local fixture image
    if (court === "Demo (Offline HTML)" || demoMode) {
      const sid = createCaptchaSession({
        court,
        demo: true,
        formPageUrl: "about:blank",
        viewState: "",
        eventValidation: "",
        viewStateGenerator: "",
        captchaUrl: "/fixtures/captcha-demo.png",
      })
      return NextResponse.json({ ok: true, sid })
    }

    // 2) Live: Fetch the court search/form page to extract tokens and the CAPTCHA image URL.
    // NOTE: Update formPageUrl to the actual case search endpoint after inspecting the live site.
    const searchUrl = "https://delhihighcourt.nic.in/"
    const formPageUrl = "https://delhihighcourt.nic.in/casequery"

    const formResp = await fetch(formPageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CourtDataFetcher/1.0; +https://example.com)",
        Referer: searchUrl,
      },
    })

    if (!formResp.ok) {
      return NextResponse.json(
        { ok: false, error: `Failed to reach form page (HTTP ${formResp.status})` },
        { status: 502 },
      )
    }

    const setCookie = formResp.headers.get("set-cookie") || undefined
    const html = await formResp.text()
    const $ = cheerio.load(html)
    const viewState = $("input[name='__VIEWSTATE']").attr("value") || ""
    const eventValidation = $("input[name='__EVENTVALIDATION']").attr("value") || ""
    const viewStateGenerator = $("input[name='__VIEWSTATEGENERATOR']").attr("value") || ""
    const captchaSrc = $("img#captcha, img.captcha, img[id*='Captcha']").attr("src") || null

    // If site uses relative path, resolve it
    const captchaUrl =
      captchaSrc && (captchaSrc.startsWith("http") ? captchaSrc : new URL(captchaSrc, formPageUrl).toString())

    const sid = createCaptchaSession({
      court,
      demo: false,
      formPageUrl,
      cookieHeader: setCookie,
      viewState,
      eventValidation,
      viewStateGenerator,
      captchaUrl: captchaUrl || undefined,
    })

    return NextResponse.json({ ok: true, sid })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to start CAPTCHA session" }, { status: 500 })
  }
}
