import type { LungifyReport } from "@/lib/report-types"

type RawReport = {
  _id: { toString(): string }
  patientUserId: string
  radiologistUserId: string
  patientName: string
  scanReference: string
  reportTitle: string
  prediction: {
    label: "Cancer Detected" | "No Cancer Detected"
    confidence: number
    modelVersion: string
    score: number
  }
  findings: string
  advice: string[]
  status: "draft" | "sent"
  createdAt: Date
  updatedAt: Date
}

export function serializeReport(doc: RawReport): LungifyReport {
  return {
    id: doc._id.toString(),
    patientUserId: doc.patientUserId,
    radiologistUserId: doc.radiologistUserId,
    patientName: doc.patientName,
    scanReference: doc.scanReference,
    reportTitle: doc.reportTitle,
    prediction: doc.prediction,
    findings: doc.findings,
    advice: doc.advice,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
