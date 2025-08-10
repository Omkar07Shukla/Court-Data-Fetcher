"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Info, RefreshCw } from "lucide-react"

type Props = {
  defaultCourt?: string
  defaultCaseType?: string
  defaultCaseNumber?: string
  defaultFilingYear?: string
  onSubmit: (values: {
    court: string
    caseType: string
    caseNumber: string
    filingYear: string
    captchaToken?: string
    manualCaptcha?: { sid: string; answer: string }
  }) => Promise<void>
}

export function CaseForm({
  defaultCourt = "Delhi High Court",
  defaultCaseType = "",
  defaultCaseNumber = "",
  defaultFilingYear = "",
  onSubmit,
}: Props) {
  const [court, setCourt] = React.useState(defaultCourt)
  const [caseType, setCaseType] = React.useState(defaultCaseType)
  const [caseNumber, setCaseNumber] = React.useState(defaultCaseNumber)
  const [filingYear, setFilingYear] = React.useState(defaultFilingYear)

  // Manual CAPTCHA state
  const [captchaSid, setCaptchaSid] = React.useState<string | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = React.useState<string>("")
  const [captchaLoading, setCaptchaLoading] = React.useState(false)
  const [captchaError, setCaptchaError] = React.useState<string | null>(null)
  const demoMode =
    typeof window !== "undefined" && (window as any).NEXT_PUBLIC_DEMO_MODE
      ? String((window as any).NEXT_PUBLIC_DEMO_MODE) === "true"
      : process.env.NEXT_PUBLIC_DEMO_MODE === "true"

  function years() {
    const now = new Date().getFullYear()
    const arr: string[] = []
    for (let y = now; y >= 1990; y--) arr.push(String(y))
    return arr
  }

  const caseTypes = ["W.P.(C)", "FAO", "CRL.M.C.", "CS(OS)", "LPA", "CM(M)"]

  async function startCaptcha() {
    setCaptchaLoading(true)
    setCaptchaError(null)
    setCaptchaSid(null)
    try {
      const res = await fetch("/api/captcha/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ court }),
      })
      const json = await res.json()
      if (!json.ok) {
        setCaptchaError(json.error || "Failed to start CAPTCHA session.")
      } else {
        setCaptchaSid(json.sid as string)
      }
    } catch (e: any) {
      setCaptchaError(e?.message || "Network error.")
    } finally {
      setCaptchaLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = { court, caseType, caseNumber, filingYear }
    if (captchaSid && captchaAnswer.trim()) {
      payload.manualCaptcha = { sid: captchaSid, answer: captchaAnswer.trim() }
    }
    await onSubmit(payload)
  }

  const showManualCaptcha = court === "Delhi High Court" && !demoMode

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="court">Court</Label>
          <Select
            value={court}
            onValueChange={(v) => {
              setCourt(v)
              // Reset captcha state when court changes
              setCaptchaSid(null)
              setCaptchaAnswer("")
              setCaptchaError(null)
            }}
          >
            <SelectTrigger id="court" className="mt-1">
              <SelectValue placeholder="Select Court" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Delhi High Court">Delhi High Court</SelectItem>
              <SelectItem value="Demo (Offline HTML)">Demo (Offline HTML)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Demo mode parses a local fixture for instant results.
          </p>
        </div>

        <div>
          <Label htmlFor="caseType">Case Type</Label>
          <Select value={caseType} onValueChange={setCaseType}>
            <SelectTrigger id="caseType" className="mt-1">
              <SelectValue placeholder="Select Case Type" />
            </SelectTrigger>
            <SelectContent>
              {caseTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="caseNumber">Case Number</Label>
          <Input
            id="caseNumber"
            className="mt-1"
            placeholder="e.g. 1234"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            required
            inputMode="numeric"
          />
        </div>

        <div>
          <Label htmlFor="filingYear">Filing Year</Label>
          <Select value={filingYear} onValueChange={setFilingYear}>
            <SelectTrigger id="filingYear" className="mt-1">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years().map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showManualCaptcha && (
        <div className="grid gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <Label>Manual CAPTCHA</Label>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={startCaptcha} disabled={captchaLoading}>
                {captchaLoading ? "Loading..." : captchaSid ? "Get New CAPTCHA" : "Get CAPTCHA"}
              </Button>
              {captchaSid && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => {
                    // Force refresh by changing sid via re-start
                    startCaptcha()
                  }}
                  title="Refresh CAPTCHA"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {captchaError && <p className="text-xs text-red-600">{captchaError}</p>}

          {captchaSid && (
            <div className="flex items-center gap-4">
              <img
                src={`/api/captcha/image?sid=${encodeURIComponent(captchaSid)}`}
                alt="CAPTCHA"
                className="h-12 w-auto rounded border bg-white"
              />
              <div className="flex-1">
                <Label htmlFor="captchaAnswer" className="sr-only">
                  CAPTCHA Answer
                </Label>
                <Input
                  id="captchaAnswer"
                  placeholder="Enter the letters/numbers you see"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  This token will be used once with your next search submission.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setCaseType("")
            setCaseNumber("")
            setFilingYear("")
            setCaptchaSid(null)
            setCaptchaAnswer("")
            setCaptchaError(null)
          }}
        >
          Reset
        </Button>
      </div>
    </form>
  )
}
