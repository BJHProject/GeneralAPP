export const runtime = "nodejs"
export const maxDuration = 10

export async function POST(request: Request) {
  console.log("[v0] ========== POLL WAVESPEED API CALLED ==========")

  try {
    const body = await request.json()
    console.log("[v0] Poll request body:", JSON.stringify(body, null, 2))

    const { requestId } = body

    if (!requestId) {
      console.error("[v0] No request ID provided")
      return Response.json({ error: "Request ID is required" }, { status: 400 })
    }

    console.log("[v0] Polling for request ID:", requestId)

    const wavespeedApiKey = process.env.WAVESPEED_API_KEY

    if (!wavespeedApiKey) {
      console.error("[v0] WAVESPEED_API_KEY not configured")
      return Response.json({ error: "WAVESPEED_API_KEY not configured" }, { status: 500 })
    }

    const pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`
    console.log("[v0] Polling URL:", pollUrl)

    const resultResponse = await fetch(pollUrl, {
      headers: {
        Authorization: `Bearer ${wavespeedApiKey}`,
      },
    })

    console.log("[v0] Poll response status:", resultResponse.status)

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text()
      console.error("[v0] Wavespeed poll error:", errorText)
      return Response.json({ error: "Failed to poll Wavespeed API" }, { status: 500 })
    }

    const resultData = await resultResponse.json()
    console.log("[v0] Poll response data:", JSON.stringify(resultData, null, 2))

    const status = resultData.status || resultData.data?.status
    const outputs = resultData.outputs || resultData.data?.outputs || resultData.output || resultData.data?.output
    const error = resultData.error || resultData.data?.error

    console.log("[v0] Extracted status:", status)
    console.log("[v0] Extracted outputs:", outputs)
    console.log("[v0] Extracted error:", error)

    const response = {
      status,
      outputs: Array.isArray(outputs) ? outputs : outputs ? [outputs] : [],
      error,
    }

    console.log("[v0] Returning response:", JSON.stringify(response, null, 2))
    return Response.json(response)
  } catch (error: any) {
    console.error("[v0] Poll error:", error)
    return Response.json({ error: error.message || "Failed to poll for results" }, { status: 500 })
  }
}
