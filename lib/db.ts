import { neon } from "@neondatabase/serverless"
import { v4 as uuidv4 } from "uuid"
import { getMemoryDB } from "@/lib/db-memory"

type LogQueryInput = {
  request: {
    court: string
    caseType: string
    caseNumber: string
    filingYear: string
    clientIp?: string
  }
  rawHtml: string | null
  parsed: any | null
  status: "success" | "error"
  error: string | null
}

const DATABASE_URL = process.env.DATABASE_URL

export async function logQueryAndResponse(input: LogQueryInput): Promise<{ queryId: string }> {
  const id = uuidv4()
  const ts = new Date().toISOString()

  if (!DATABASE_URL) {
    // Fallback to memory store for local/demo
    const mem = getMemoryDB()
    mem.queries.push({
      id,
      created_at: ts,
      court: input.request.court,
      case_type: input.request.caseType,
      case_number: input.request.caseNumber,
      filing_year: input.request.filingYear,
      client_ip: input.request.clientIp || null,
      status: input.status,
      error: input.error,
    })
    mem.responses.push({
      id: uuidv4(),
      query_id: id,
      created_at: ts,
      raw_html: input.rawHtml,
      parsed_json: input.parsed ? JSON.stringify(input.parsed) : null,
    })
    return { queryId: id }
  }

  const sql = neon(DATABASE_URL)

  await sql`
    INSERT INTO app_queries (id, court, case_type, case_number, filing_year, client_ip, status, error)
    VALUES (${id}, ${input.request.court}, ${input.request.caseType}, ${input.request.caseNumber}, ${input.request.filingYear}, ${input.request.clientIp || null}, ${input.status}, ${input.error || null});
  `

  await sql`
    INSERT INTO app_responses (query_id, raw_html, parsed_json)
    VALUES (${id}, ${input.rawHtml}, ${input.parsed ? JSON.stringify(input.parsed) : null});
  `

  return { queryId: id }
}
