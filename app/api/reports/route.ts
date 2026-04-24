import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/mongodb"
import { getActorFromRequest } from "@/lib/api-auth"
import { serializeReport } from "@/lib/report-serializer"

const createSchema = z.object({
  patientUserId: z.string().min(1),
  patientName: z.string().min(1),
  scanReference: z.string().min(3),
  reportTitle: z.string().min(3).max(120),
  findings: z.string().min(10),
  advice: z.array(z.string().min(3)).min(1),
  prediction: z.object({
    label: z.enum(["Cancer Detected", "No Cancer Detected"]),
    confidence: z.number().min(0).max(1),
    modelVersion: z.string().min(1),
    score: z.number().min(0).max(1),
  }),
})

export async function GET(request: NextRequest) {
  const auth = getActorFromRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 400 })
  }

  const db = await getDb()
  const reportsCollection = db.collection("reports")

  const patientFilter = request.nextUrl.searchParams.get("patientUserId")
  const baseQuery =
    auth.actor.role === "radiologist"
      ? { radiologistUserId: auth.actor.userId }
      : { patientUserId: auth.actor.userId, status: "sent" }

  const finalQuery = patientFilter ? { ...baseQuery, patientUserId: patientFilter } : baseQuery

  const docs = await reportsCollection.find(finalQuery).sort({ updatedAt: -1 }).toArray()

  return NextResponse.json({
    reports: docs.map((doc) => serializeReport(doc as never)),
  })
}

export async function POST(request: NextRequest) {
  const auth = getActorFromRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 400 })
  }

  if (auth.actor.role !== "radiologist") {
    return NextResponse.json({ error: "Only radiologists can create reports." }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = await getDb()
  const reportsCollection = db.collection("reports")
  const usersCollection = db.collection("users")

  const now = new Date()

  await usersCollection.updateOne(
    { userId: parsed.data.patientUserId },
    {
      $set: {
        userId: parsed.data.patientUserId,
        role: "patient",
        name: parsed.data.patientName,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  )

  await usersCollection.updateOne(
    { userId: auth.actor.userId },
    {
      $set: {
        userId: auth.actor.userId,
        role: "radiologist",
        name: auth.actor.userId,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  )

  const insertResult = await reportsCollection.insertOne({
    ...parsed.data,
    status: "draft",
    radiologistUserId: auth.actor.userId,
    createdAt: now,
    updatedAt: now,
  })

  const createdDoc = await reportsCollection.findOne({ _id: insertResult.insertedId })

  return NextResponse.json(
    {
      report: createdDoc ? serializeReport(createdDoc as never) : null,
    },
    { status: 201 },
  )
}
