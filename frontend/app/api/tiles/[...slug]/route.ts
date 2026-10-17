import { NextRequest, NextResponse } from "next/server"

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params
    if (!slug || slug.length < 3) {
      return new NextResponse("Invalid tile path", { status: 400 })
    }

    // Filter out version prefixes like "v2"
    const parts = slug.filter((s) => s !== "v2")
    if (parts.length < 3) {
      return new NextResponse("Invalid tile coordinates", { status: 400 })
    }

    let z = "0"
    let x = "0"
    let yWithExt = "0.png"

    if (parts.length >= 4) {
      z = parts[1]
      x = parts[2]
      yWithExt = parts[3]
    } else {
      z = parts[0]
      x = parts[1]
      yWithExt = parts[2]
    }

    const y = yWithExt.replace(/\.png$/, "")

    // Clean OpenStreetMap tiles: 100% free, NO API KEY, ZERO watermark
    const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`

    const upstreamRes = await fetch(osmUrl, {
      headers: {
        "User-Agent": "FloodWatch-IBM-Datathon-GIS/2.0 (floodwatch.local)",
      },
      signal: AbortSignal.timeout(4000),
    })

    if (upstreamRes.ok) {
      const buffer = await upstreamRes.arrayBuffer()
      return new Response(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    return new Response(TRANSPARENT_PNG, {
      headers: {
        "Content-Type": "image/png",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch {
    return new Response(TRANSPARENT_PNG, {
      headers: {
        "Content-Type": "image/png",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}
