export type AppRole = "radiologist" | "patient"

export type PredictionResult = {
  label: "Cancer Detected" | "No Cancer Detected"
  confidence: number
  modelVersion: string
  score: number
}

export type ReportStatus = "draft" | "sent"

export type LungifyReport = {
  id: string
  patientUserId: string
  radiologistUserId: string
  patientName: string
  scanReference: string
  reportTitle: string
  prediction: PredictionResult
  findings: string
  advice: string[]
  status: ReportStatus
  createdAt: string
  updatedAt: string
}
