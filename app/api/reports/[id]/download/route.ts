import { ObjectId } from "mongodb"
import { NextRequest, NextResponse } from "next/server"
import { getActorFromRequest } from "@/lib/api-auth"
import { getDb } from "@/lib/mongodb"
import { buildHospitalReportPdf } from "@/lib/pdf-report"
import { serializeReport } from "@/lib/report-serializer"

export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = getActorFromRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 400 })
  }

  const { id } = await context.params

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 })
  }

  const db = await getDb()
  const reportsCollection = db.collection("reports")

  const report = await reportsCollection.findOne({ _id: new ObjectId(id) })

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 })
  }

  const canAccess =
    auth.actor.role === "radiologist"
      ? report.radiologistUserId === auth.actor.userId
      : report.patientUserId === auth.actor.userId && report.status === "sent"

  if (!canAccess) {
    return NextResponse.json({ error: "You do not have access to this report." }, { status: 403 })
  }

  const serializedReport = serializeReport(report as never)
  const pdfBuffer = await buildHospitalReportPdf(serializedReport)

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=lungify-hospital-report-${report._id.toString()}.pdf`,
    },
  })
}
