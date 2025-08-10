type MemQuery = {
  id: string
  created_at: string
  court: string
  case_type: string
  case_number: string
  filing_year: string
  client_ip: string | null
  status: string
  error: string | null
}
type MemResp = {
  id: string
  query_id: string
  created_at: string
  raw_html: string | null
  parsed_json: string | null
}

const memory = {
  queries: [] as MemQuery[],
  responses: [] as MemResp[],
}

export function getMemoryDB() {
  return memory
}
