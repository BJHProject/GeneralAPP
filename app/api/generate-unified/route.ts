import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deductCredits, checkIdempotency, updateIdempotencyResult, CREDIT_COSTS } from "@/lib/credits-supabase"

type GenerationKind = "image" | "edit" | "video3" | "video5"

export const runtime = "nodejs" // Required for Prisma

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { kind, idempotencyKey, payload } = body as {
      kind: GenerationKind
      idempotencyKey: string
      payload: any
    }

    if (!kind || !idempotencyKey || !payload) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate kind
    if (!["image", "edit", "video3", "video5"].includes(kind)) {
      return NextResponse.json({ error: "Invalid generation kind" }, { status: 400 })
    }

    console.log("[v0] Generation request:", { userId, kind, idempotencyKey })

    // Check idempotency
    const idempotencyCheck = await checkIdempotency(idempotencyKey, userId, kind)

    if (idempotencyCheck.exists && !idempotencyCheck.canProceed) {
      if (idempotencyCheck.result) {
        // Return cached result
        console.log("[v0] Returning cached result for idempotency key:", idempotencyKey)
        return NextResponse.json(idempotencyCheck.result)
      }

      return NextResponse.json({ error: "Request already in progress or conflicting parameters" }, { status: 409 })
    }

    // Deduct credits atomically
    const deductionResult = await deductCredits(userId, kind)

    if (!deductionResult.success) {
      await updateIdempotencyResult(idempotencyKey, "failed")
      return NextResponse.json({ error: deductionResult.error || "Failed to deduct credits" }, { status: 409 })
    }

    console.log("[v0] Credits deducted. Remaining:", deductionResult.remainingCredits)

    try {
      // Call the appropriate generation API based on kind
      let result: any

      if (kind === "image") {
        const response = await fetch(`${request.nextUrl.origin}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        result = await response.json()
      } else if (kind === "edit") {
        const response = await fetch(`${request.nextUrl.origin}/api/edit-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        result = await response.json()
      } else if (kind === "video3" || kind === "video5") {
        const response = await fetch(`${request.nextUrl.origin}/api/generate-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        result = await response.json()
      }

      // Store success result
      const finalResult = {
        ...result,
        remainingCredits: deductionResult.remainingCredits,
        creditsUsed: CREDIT_COSTS[kind],
      }

      await updateIdempotencyResult(idempotencyKey, "succeeded", finalResult)

      return NextResponse.json(finalResult)
    } catch (error: any) {
      console.error("[v0] Generation error:", error)

      // Mark as failed but don't refund credits (generation was attempted)
      await updateIdempotencyResult(idempotencyKey, "failed")

      return NextResponse.json(
        {
          error: "Generation failed",
          remainingCredits: deductionResult.remainingCredits,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("[v0] Unified generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
