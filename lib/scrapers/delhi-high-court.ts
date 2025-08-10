import * as cheerio from "cheerio"
import type { CourtScraper, ScrapeOptions, ScrapeResult } from "@/lib/scrapers/base"
import { solveCaptchaIfNeeded } from "@/lib/captcha/solvers"
import { getCaptchaSession, deleteCaptchaSession } from "@/lib/captcha/session-store"

/**
 * Delhi High Court scraper with support for:
 * - Demo fixture parsing
 * - Auto-solver (2Captcha/AntiCaptcha) when configured
 * - Manual CAPTCHA flow using a session started from /api/captcha/start
 */
export const runDelhiHighCourt: CourtScraper = async (
  input: {
    caseType: string
    caseNumber: string
    filingYear: string
    captchaToken?: string
    manualCaptcha?: { sid: string; answer: string }
  },
  options?: ScrapeOptions,
): Promise<ScrapeResult> => {
  const useFixture = !!options?.htmlOverride
  let html: string

  if (useFixture) {
    html = options!.htmlOverride!
  } else {
    // Use manual session if provided
    const manual = input.manualCaptcha
    const searchUrl = "https://delhihighcourt.nic.in/"
    const formPageUrlDefault = "https://delhihighcourt.nic.in/casequery"

    let formPageUrl = formPageUrlDefault
    let viewState = ""
    let viewStateGenerator = ""
    let eventValidation = ""
    let cookieHeader: string | undefined
    let captchaAnswer: string | undefined = input.captchaToken

    if (manual?.sid) {
      const session = getCaptchaSession(manual.sid)
      if (!session) {
        throw new Error("CAPTCHA session expired. Please click Get CAPTCHA again.")
      }
      formPageUrl = session.formPageUrl
      viewState = session.viewState || ""
      viewStateGenerator = session.viewStateGenerator || ""
      eventValidation = session.eventValidation || ""
      cookieHeader = session.cookieHeader
      captchaAnswer = manual.answer
    } else {
      // Auto-flow: fetch form page, extract tokens and solve captcha if possible
      const formResp = await fetch(formPageUrlDefault, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CourtDataFetcher/1.0; +https://example.com)",
          Referer: searchUrl,
        },
      })
      if (!formResp.ok) {
        throw new Error(`Failed to reach Delhi High Court form (HTTP ${formResp.status})`)
      }
      const setCookie = formResp.headers.get("set-cookie") || undefined
      const formHtml = await formResp.text()
      const $start = cheerio.load(formHtml)

      viewState = $start("input[name='__VIEWSTATE']").attr("value") || ""
      eventValidation = $start("input[name='__EVENTVALIDATION']").attr("value") || ""
      viewStateGenerator = $start("input[name='__VIEWSTATEGENERATOR']").attr("value") || ""
      cookieHeader = setCookie

      const captchaSrc = $start("img#captcha, img.captcha, img[id*='Captcha']").attr("src") || null
      if (!options?.skipCaptcha) {
        if (!captchaAnswer && captchaSrc) {
          const absoluteCaptchaUrl = captchaSrc.startsWith("http")
            ? captchaSrc
            : new URL(captchaSrc, formPageUrlDefault).toString()
          captchaAnswer = await solveCaptchaIfNeeded(absoluteCaptchaUrl)
        }
      }
    }

    // Submit form with tokens and captcha answer
    const formData = new URLSearchParams()
    formData.set("__VIEWSTATE", viewState)
    formData.set("__VIEWSTATEGENERATOR", viewStateGenerator)
    formData.set("__EVENTVALIDATION", eventValidation)
    formData.set("ddlCaseType", input.caseType) // update with actual live field name
    formData.set("txtCaseNumber", input.caseNumber) // update with actual live field name
    formData.set("ddlYear", input.filingYear) // update with actual live field name
    if (captchaAnswer) formData.set("captcha", captchaAnswer)
    formData.set("btnSearch", "Search")

    const submitResp = await fetch(formPageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; CourtDataFetcher/1.0; +https://example.com)",
        Referer: formPageUrl,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: formData.toString(),
    })
    if (!submitResp.ok) {
      throw new Error(`Search request failed (HTTP ${submitResp.status})`)
    }

    html = await submitResp.text()

    // One-shot: remove the manual session after use to avoid reuse
    if (manual?.sid) deleteCaptchaSession(manual.sid)
  }

  // Parse Result HTML
  const $ = cheerio.load(html)

  const petitioner =
    $("td:contains('Petitioner')").next().text().trim() || $("td:contains('Appellant')").next().text().trim() || ""
  const respondent =
    $("td:contains('Respondent')").next().text().trim() || $("td:contains('Defendant')").next().text().trim() || ""
  const filingDate =
    $("td:contains('Filing Date')").next().text().trim() ||
    $("td:contains('Date of filing')").next().text().trim() ||
    ""
  const nextHearingDate =
    $("td:contains('Next Date')").next().text().trim() || $("td:contains('Next Hearing')").next().text().trim() || ""

  const orders: { title: string; date?: string; url: string }[] = []
  $("a[href$='.pdf'], a[href*='.pdf?']").each((_i, el) => {
    if (orders.length >= 5) return
    const href = $(el).attr("href") || ""
    if (!href) return
    const url = href.startsWith("http") ? href : new URL(href, "https://delhihighcourt.nic.in/").toString()
    const title = $(el).text().trim() || $(el).attr("title")?.trim() || "Order / Judgment"
    const dateText =
      $(el).closest("tr").find("td:contains('Date')").next().text().trim() ||
      $(el)
        .parent()
        .text()
        .match(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/)?.[0] ||
      undefined
    orders.push({ title, date: dateText, url })
  })
  if (orders.length === 0) {
    $("table:contains('Orders') a").each((_i, el) => {
      const href = $(el).attr("href") || ""
      if (href && (href.endsWith(".pdf") || href.includes(".pdf"))) {
        const url = href.startsWith("http") ? href : new URL(href, "https://delhihighcourt.nic.in/").toString()
        orders.push({ title: $(el).text().trim() || "Order / Judgment", url })
      }
    })
  }

  const result: ScrapeResult = {
    caseType: input.caseType,
    caseNumber: input.caseNumber,
    filingYear: input.filingYear,
    parties: {
      petitioner: petitioner || undefined,
      respondent: respondent || undefined,
    },
    filingDate: filingDate || undefined,
    nextHearingDate: nextHearingDate || undefined,
    orders,
    __rawHtml: options?.htmlOverride ? undefined : html,
  }

  const hasNoData = !result.parties?.petitioner && !result.parties?.respondent && orders.length === 0
  if (hasNoData) {
    const errMsg = $("div.error, span.error, p.error").first().text().trim() || ""
    if (errMsg) throw new Error(errMsg)
    throw new Error("No data found. Please verify Case Type/Number/Year or try again later.")
  }

  return result
}
