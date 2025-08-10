"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, LinkIcon } from "lucide-react"

type Data = {
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
  queryId?: string
}

export function ResultsCard({ data }: { data: Data }) {
  const items = data.orders || []
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>Result: {data.court}</span>
          <Badge variant="outline">
            {data.caseType} {data.caseNumber}/{data.filingYear}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <section className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-1">Parties</h3>
            <div className="text-sm">
              <div>
                <span className="font-semibold">Petitioner:</span> {data.parties?.petitioner || "—"}
              </div>
              <div>
                <span className="font-semibold">Respondent:</span> {data.parties?.respondent || "—"}
              </div>
              {(data.parties?.otherParties?.length || 0) > 0 && (
                <ul className="list-disc ml-5 mt-1">
                  {data.parties!.otherParties!.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-1">Dates</h3>
            <div className="text-sm">
              <div>
                <span className="font-semibold">Filing:</span> {data.filingDate || "—"}
              </div>
              <div>
                <span className="font-semibold">Next Hearing:</span> {data.nextHearingDate || "—"}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-medium mb-2">Latest Orders/Judgments</h3>
          {items.length === 0 && <div className="text-sm text-muted-foreground">No orders found.</div>}
          <ul className="grid gap-2">
            {items.map((it, idx) => {
              const proxied = `/api/pdf-proxy?u=${encodeURIComponent(Buffer.from(it.url).toString("base64"))}`
              return (
                <li
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-xs text-muted-foreground">{it.date || ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm underline"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Open
                    </a>
                    <Button size="sm" variant="secondary" asChild title="Download via proxy (fixes CORS)">
                      <a href={proxied} download>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </CardContent>
    </Card>
  )
}
