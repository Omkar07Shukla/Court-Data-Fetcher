import type { ParsedCase } from "@/lib/types"

export type ScrapeOptions = {
  htmlOverride?: string
  skipCaptcha?: boolean
}

export type ScrapeResult = ParsedCase & {
  __rawHtml?: string
}

export type CourtScraper = (
  input: {
    caseType: string
    caseNumber: string
    filingYear: string
    captchaToken?: string
  },
  options?: ScrapeOptions,
) => Promise<ScrapeResult>
