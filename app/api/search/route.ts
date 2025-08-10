import { type NextRequest, NextResponse } from "next/server"
import { runSearch } from "@/lib/scraper-runner"
import { logQueryAndResponse } from "@/lib/db"
import type { SearchRequestBody } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SearchRequestBody

    if (!body.caseType || !body.caseNumber || !body.filingYear || !body.court) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 })
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.ip || "unknown"

    // Execute scrape (live or demo depending on env/court)
    const { rawHtml, parsed, court } = await runSearch(body)

    // Persist logs (best-effort; falls back to memory if no DB env)
    const { queryId } = await logQueryAndResponse({
      request: {
        court: body.court,
        caseType: body.caseType,
        caseNumber: body.caseNumber,
        filingYear: body.filingYear,
        clientIp,
      },
      rawHtml,
      parsed,
      status: "success",
      error: null,
    })

    return NextResponse.json({
      ok: true,
      data: {
        ...parsed,
        court,
        rawHtmlStored: !!rawHtml,
        queryId,
      },
    })
  } catch (e: any) {
    // Log error
    try {
      const body = (await req.json().catch(() => ({}))) as Partial<SearchRequestBody>
      await logQueryAndResponse({
        request: {
          court: body.court || "unknown",
          caseType: body.caseType || "unknown",
          caseNumber: body.caseNumber || "unknown",
          filingYear: body.filingYear || "unknown",
          clientIp: req.headers.get("x-forwarded-for") || req.ip || "unknown",
        },
        rawHtml: null,
        parsed: null,
        status: "error",
        error: e?.message || "Unknown error",
      })
    } catch {}

    const isDowntime =
      typeof e?.message === "string" &&
      (e.message.includes("ECONN") || e.message.includes("timed out") || e.message.includes("fetch failed"))

    return NextResponse.json(
      {
        ok: false,
        error: isDowntime
          ? "The court website appears to be down or unreachable. Please try again later."
          : e?.message || "Unexpected error occurred.",
      },
      { status: 500 },
    )
  }
}
