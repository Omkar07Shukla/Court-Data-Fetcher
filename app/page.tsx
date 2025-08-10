"use client"

import * as React from "react"
import { CaseForm } from "@/components/case-form"
import { ResultsCard } from "@/components/results-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

type SearchResponse = {
  ok: boolean
  error?: string
  data?: {
    court: string
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
    rawHtmlStored?: boolean
    queryId?: string
  }
}

export default function Page() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<SearchResponse["data"] | null>(null)

  async function onSearch(values: {
    court: string
    caseType: string
    caseNumber: string
    filingYear: string
    captchaToken?: string
  }) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const json: SearchResponse = await res.json()
      if (!json.ok) {
        setError(json.error || "Something went wrong.")
      } else {
        setResult(json.data!)
      }
    } catch (e: any) {
      setError(e?.message || "Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-svh mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Court-Data Fetcher & Mini-Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        Choose a court, enter case details, and fetch latest metadata and orders. Uses App Router, API routes, and
        server-side scraping. [Demo Mode available]
      </p>

      <Card className="p-4 mb-6">
        <CaseForm
          defaultCourt="Delhi High Court"
          defaultCaseType="W.P.(C)"
          defaultCaseNumber="1234"
          defaultFilingYear="2023"
          onSubmit={onSearch}
        />
      </Card>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Fetching case data…</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Fetch failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && result && <ResultsCard data={result} />}
    </main>
  )
}
