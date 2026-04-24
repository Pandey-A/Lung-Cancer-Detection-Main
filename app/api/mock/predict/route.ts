import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getActorFromRequest } from "@/lib/api-auth"
import { generateDraftFromPrediction, runPrediction } from "@/lib/mock-prediction"

const payloadSchema = z.object({
  scanReference: z.string().min(3),
})

export async function POST(request: NextRequest) {
  const auth = getActorFromRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 400 })
  }

  if (auth.actor.role !== "radiologist") {
    return NextResponse.json({ error: "Only radiologists can run prediction." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const prediction = await runPrediction(parsed.data.scanReference)
  const draft = generateDraftFromPrediction(prediction)

  return NextResponse.json({
    prediction,
    draft,
  })
}
