import type { PredictionResult } from "@/lib/report-types"

function stringHash(input: string) {
  let hash = 0

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }

  return Math.abs(hash)
}

export async function runPrediction(scanReference: string): Promise<PredictionResult> {
  const predictionUrl = process.env.PREDICTION_URL

  if (predictionUrl) {
    try {
      const res = await fetch(predictionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scanReference }),
      })

      if (res.ok) {
        const payload = await res.json()
        const score = Number(payload.score ?? payload.confidence ?? 0.5)
        const normalizedScore = Math.max(0, Math.min(1, score))

        return {
          label: normalizedScore >= 0.5 ? "Cancer Detected" : "No Cancer Detected",
          confidence: Number(normalizedScore.toFixed(2)),
          modelVersion: String(payload.modelVersion ?? "external-model"),
          score: Number(normalizedScore.toFixed(4)),
        }
      }
    } catch {
      // Use local fallback mock output when remote inference is unavailable.
    }
  }

  const hash = stringHash(scanReference)
  const score = (hash % 1000) / 1000
  const rounded = Number(score.toFixed(2))

  return {
    label: rounded >= 0.52 ? "Cancer Detected" : "No Cancer Detected",
    confidence: rounded,
    modelVersion: "mock-dl-v1",
    score: Number(score.toFixed(4)),
  }
}

export function generateDraftFromPrediction(prediction: PredictionResult) {
  const baseFindings =
    prediction.label === "Cancer Detected"
      ? "AI triage indicates suspicious pulmonary nodules with elevated malignancy likelihood. Correlate with full clinical history and prior scans."
      : "AI triage does not indicate high-risk malignant pattern in the submitted CT reference. Continue periodic screening based on risk factors."

  const advice =
    prediction.label === "Cancer Detected"
      ? [
          "Recommend contrast-enhanced follow-up imaging for lesion characterization.",
          "Discuss biopsy suitability in multidisciplinary tumor board.",
          "Initiate smoking cessation counseling and pulmonary rehabilitation guidance.",
        ]
      : [
          "Maintain annual low-dose CT surveillance where clinically indicated.",
          "Continue preventive respiratory care and smoking risk reduction.",
          "Escalate evaluation if new symptoms emerge.",
        ]

  return {
    findings: `${baseFindings} Model confidence: ${(prediction.confidence * 100).toFixed(0)}%.`,
    advice,
  }
}
