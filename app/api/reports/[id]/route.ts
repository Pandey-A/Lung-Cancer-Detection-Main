import { ObjectId } from "mongodb"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getActorFromRequest } from "@/lib/api-auth"
import { getDb } from "@/lib/mongodb"
import { serializeReport } from "@/lib/report-serializer"

const updateSchema = z.object({
  reportTitle: z.string().min(3).max(120).optional(),
  patientName: z.string().min(1).optional(),
  patientUserId: z.string().min(1).optional(),
  findings: z.string().min(10).optional(),
  advice: z.array(z.string().min(3)).min(1).optional(),
  status: z.enum(["draft", "sent"]).optional(),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = getActorFromRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 400 })
  }

  if (auth.actor.role !== "radiologist") {
    return NextResponse.json({ error: "Only radiologists can edit reports." }, { status: 403 })
  }

  const { id } = await context.params

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = await getDb()
  const reportsCollection = db.collection("reports")

  const updatedResult = await reportsCollection.findOneAndUpdate(
    {
      _id: new ObjectId(id),
      radiologistUserId: auth.actor.userId,
    },
    {
      $set: {
        ...parsed.data,
        updatedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
    },
  )

  if (!updatedResult) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 })
  }

  return NextResponse.json({ report: serializeReport(updatedResult as never) })
}
