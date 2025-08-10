import type { SearchRequestBody, ParsedCase } from "@/lib/types"
import { runDelhiHighCourt } from "@/lib/scrapers/delhi-high-court"

export async function runSearch(req: SearchRequestBody): Promise<{
  rawHtml: string | null
  parsed: ParsedCase
  court: string
}> {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  const court = req.court

  if (court === "Demo (Offline HTML)" || demoMode) {
    // Parse fixture for demo
    const htmlRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/fixtures/delhi-sample.html`).catch(
      () => null,
    )
    // If public path is not resolvable in this environment, use a relative path fetch
    const htmlText =
      htmlRes && htmlRes.ok ? await htmlRes.text() : await (await fetch("/fixtures/delhi-sample.html")).text()
    const parsed = await runDelhiHighCourt(req, {
      htmlOverride: htmlText,
      skipCaptcha: true,
    })
    return {
      rawHtml: htmlText,
      parsed,
      court: "Delhi High Court (Fixture)",
    }
  }

  // Live scrape for Delhi High Court
  if (court === "Delhi High Court") {
    const parsed = await runDelhiHighCourt(req, {})
    return {
      rawHtml: parsed?.__rawHtml || null,
      parsed: {
        caseType: parsed.caseType,
        caseNumber: parsed.caseNumber,
        filingYear: parsed.filingYear,
        parties: parsed.parties,
        filingDate: parsed.filingDate,
        nextHearingDate: parsed.nextHearingDate,
        orders: parsed.orders,
      },
      court,
    }
  }

  throw new Error("Unsupported court selected.")
}
