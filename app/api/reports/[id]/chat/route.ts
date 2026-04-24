import { ObjectId } from "mongodb"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getActorFromRequest } from "@/lib/api-auth"
import { getDb } from "@/lib/mongodb"

const askSchema = z.object({
  message: z.string().min(3).max(600),
})

function buildAssistantReply(
  question: string,
  report: {
    findings: string
    prediction: {
      label: string
      confidence: number
    }
    advice: string[]
  },
) {
  const confidence = `${Math.round(report.prediction.confidence * 100)}%`
  const firstAdvice = report.advice[0] || "Follow clinical guidance from your radiologist."

  return [
    `Based on your report, prediction summary is: ${report.prediction.label} with confidence ${confidence}.`,
    `Key finding: ${report.findings}`,
    `Recommended next step: ${firstAdvice}`,
    `Question received: "${question}". This assistant is informational and does not replace direct medical consultation.`,
  ].join(" ")
}

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
  const messagesCollection = db.collection("chatMessages")

  const report = await reportsCollection.findOne({ _id: new ObjectId(id) })

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 })
  }

  const canAccess =
    auth.actor.role === "radiologist"
      ? report.radiologistUserId === auth.actor.userId
      : report.patientUserId === auth.actor.userId && report.status === "sent"

  if (!canAccess) {
    return NextResponse.json({ error: "You do not have access to this chat." }, { status: 403 })
  }

  const messages = await messagesCollection
    .find({ reportId: id })
    .sort({ createdAt: 1 })
    .toArray()

  return NextResponse.json({
    messages: messages.map((msg) => ({
      id: msg._id.toString(),
      role: msg.role,
      message: msg.message,
      createdAt: new Date(msg.createdAt).toISOString(),
    })),
  })
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = getActorFromRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 400 })
  }

  const { id } = await context.params

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = askSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = await getDb()
  const reportsCollection = db.collection("reports")
  const messagesCollection = db.collection("chatMessages")

  const report = await reportsCollection.findOne({ _id: new ObjectId(id) })

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 })
  }

  const canAccess =
    auth.actor.role === "radiologist"
      ? report.radiologistUserId === auth.actor.userId
      : report.patientUserId === auth.actor.userId && report.status === "sent"

  if (!canAccess) {
    return NextResponse.json({ error: "You do not have access to this chat." }, { status: 403 })
  }

  const now = new Date()

  await messagesCollection.insertOne({
    reportId: id,
    userId: auth.actor.userId,
    role: "user",
    message: parsed.data.message,
    createdAt: now,
  })

  const reply = buildAssistantReply(parsed.data.message, {
    findings: report.findings,
    prediction: report.prediction,
    advice: report.advice,
  })

  await messagesCollection.insertOne({
    reportId: id,
    role: "assistant",
    message: reply,
    createdAt: new Date(),
  })

  const messages = await messagesCollection
    .find({ reportId: id })
    .sort({ createdAt: 1 })
    .toArray()

  return NextResponse.json({
    messages: messages.map((msg) => ({
      id: msg._id.toString(),
      role: msg.role,
      message: msg.message,
      createdAt: new Date(msg.createdAt).toISOString(),
    })),
  })
}
