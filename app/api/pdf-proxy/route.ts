import type { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u")
  if (!u) {
    return new Response("Missing url", { status: 400 })
  }
  try {
    const target = Buffer.from(u, "base64").toString("utf-8")
    const res = await fetch(target, { redirect: "follow" })
    if (!res.ok) {
      return new Response("Failed to fetch PDF", { status: 502 })
    }
    const contentType = res.headers.get("content-type") || "application/pdf"
    const arrayBuffer = await res.arrayBuffer()
    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="order.pdf"`,
      },
    })
  } catch (e: any) {
    return new Response(e?.message || "Proxy failed", { status: 500 })
  }
}
