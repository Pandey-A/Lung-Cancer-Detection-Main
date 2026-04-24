import { ObjectId } from "mongodb"
import { NextRequest, NextResponse } from "next/server"
import { getActorFromRequest } from "@/lib/api-auth"
import { getDb } from "@/lib/mongodb"
import { serializeReport } from "@/lib/report-serializer"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = getActorFromRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 400 })
  }

  if (auth.actor.role !== "radiologist") {
    return NextResponse.json({ error: "Only radiologists can send reports." }, { status: 403 })
  }

  const { id } = await context.params

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 })
  }

  const db = await getDb()
  const reportsCollection = db.collection("reports")

  const report = await reportsCollection.findOneAndUpdate(
    {
      _id: new ObjectId(id),
      radiologistUserId: auth.actor.userId,
    },
    {
      $set: {
        status: "sent",
        updatedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
    },
  )

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 })
  }

  return NextResponse.json({ report: serializeReport(report as never) })
}
