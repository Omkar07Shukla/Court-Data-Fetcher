export type ManualCaptcha = {
  sid: string
  answer: string
}

export type SearchRequestBody = {
  court: string
  caseType: string
  caseNumber: string
  filingYear: string
  // Optional legacy auto-solver token (e.g., if provided externally)
  captchaToken?: string
  // Manual captcha flow (recommended): includes session ID and user-entered answer
  manualCaptcha?: ManualCaptcha
}

export type ParsedCase = {
  caseType: string
  caseNumber: string
  filingYear: string
  parties?: {
    petitioner?: string
    respondent?: string
    otherParties?: string[]
  }
  filingDate?: string
  nextHearingDate?: string
  orders?: {
    title: string
    date?: string
    url: string
  }[]
}
