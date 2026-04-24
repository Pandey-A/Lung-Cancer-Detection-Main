"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Download, Loader2, Send, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { LungifyReport, PredictionResult } from "@/lib/report-types"

type PredictionPayload = {
  prediction: PredictionResult
  draft: {
    findings: string
    advice: string[]
  }
}

export default function RadiologistPage() {
  const [radiologistId, setRadiologistId] = useState("rad-001")
  const [patientId, setPatientId] = useState("user-001")
  const [patientName, setPatientName] = useState("John Doe")
  const [scanReference, setScanReference] = useState("CT-LUNG-2026-04-20-AX001")
  const [reportTitle, setReportTitle] = useState("Lung CT Analysis Report")
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [findings, setFindings] = useState("")
  const [adviceInput, setAdviceInput] = useState("")
  const [reports, setReports] = useState<LungifyReport[]>([])
  const [selectedReportId, setSelectedReportId] = useState("")
  const [loadingPrediction, setLoadingPrediction] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)
  const [message, setMessage] = useState("")

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || null,
    [reports, selectedReportId],
  )

  async function loadReports() {
    setLoadingList(true)
    setMessage("")

    try {
      const res = await fetch("/api/reports", {
        headers: {
          "x-user-role": "radiologist",
          "x-user-id": radiologistId,
        },
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || "Failed to fetch reports")
        return
      }

      setReports(data.reports)
      setSelectedReportId(data.reports?.[0]?.id || "")
    } catch {
      setMessage("Unable to load reports.")
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [radiologistId])

  useEffect(() => {
    if (!selectedReport) {
      return
    }

    setReportTitle(selectedReport.reportTitle)
    setPatientId(selectedReport.patientUserId)
    setPatientName(selectedReport.patientName)
    setScanReference(selectedReport.scanReference)
    setPrediction(selectedReport.prediction)
    setFindings(selectedReport.findings)
    setAdviceInput(selectedReport.advice.join("\n"))
  }, [selectedReport])

  async function handlePredict() {
    setLoadingPrediction(true)
    setMessage("")

    try {
      const res = await fetch("/api/mock/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "radiologist",
          "x-user-id": radiologistId,
        },
        body: JSON.stringify({ scanReference }),
      })

      const data = (await res.json()) as PredictionPayload & { error?: string }

      if (!res.ok) {
        setMessage(data.error || "Prediction failed")
        return
      }

      setPrediction(data.prediction)
      setFindings(data.draft.findings)
      setAdviceInput(data.draft.advice.join("\n"))
      setMessage("Prediction completed. Review and save report draft.")
    } catch {
      setMessage("Unable to run prediction.")
    } finally {
      setLoadingPrediction(false)
    }
  }

  async function handleCreateReport() {
    if (!prediction) {
      setMessage("Run prediction first.")
      return
    }

    const advice = adviceInput
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)

    setLoadingSave(true)
    setMessage("")

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "radiologist",
          "x-user-id": radiologistId,
        },
        body: JSON.stringify({
          patientUserId: patientId,
          patientName,
          scanReference,
          reportTitle,
          findings,
          advice,
          prediction,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || "Could not save report")
        return
      }

      setMessage("Draft report saved.")
      await loadReports()
      if (data.report?.id) {
        setSelectedReportId(data.report.id)
      }
    } catch {
      setMessage("Unable to save report.")
    } finally {
      setLoadingSave(false)
    }
  }

  async function handleUpdateReport() {
    if (!selectedReportId) {
      setMessage("Select a report to edit.")
      return
    }

    const advice = adviceInput
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)

    setLoadingSave(true)
    setMessage("")

    try {
      const res = await fetch(`/api/reports/${selectedReportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "radiologist",
          "x-user-id": radiologistId,
        },
        body: JSON.stringify({
          reportTitle,
          patientName,
          patientUserId: patientId,
          findings,
          advice,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || "Could not update report")
        return
      }

      setMessage("Report updated.")
      await loadReports()
      setSelectedReportId(data.report.id)
    } catch {
      setMessage("Unable to update report.")
    } finally {
      setLoadingSave(false)
    }
  }

  async function handleSendReport() {
    if (!selectedReportId) {
      setMessage("Select a report before sending.")
      return
    }

    setLoadingSend(true)
    setMessage("")

    try {
      const res = await fetch(`/api/reports/${selectedReportId}/send`, {
        method: "POST",
        headers: {
          "x-user-role": "radiologist",
          "x-user-id": radiologistId,
        },
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || "Could not send report")
        return
      }

      setMessage(`Report sent to ${data.report.patientName} (${data.report.patientUserId}).`)
      await loadReports()
      setSelectedReportId(data.report.id)
    } catch {
      setMessage("Unable to send report.")
    } finally {
      setLoadingSend(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Radiologist Workspace</h1>
            <p className="text-sm text-zinc-400">Run prediction, generate report, edit findings, and send to a patient.</p>
          </div>
          <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/70">
            <Link href="/patient">Go to Patient Portal</Link>
          </Button>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-zinc-800/80 bg-zinc-900/60 text-zinc-100">
            <CardHeader>
              <CardTitle>AI Report Generator</CardTitle>
              <CardDescription className="text-zinc-400">Use mock deep learning prediction until external model URL is connected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  Radiologist ID
                  <Input
                    value={radiologistId}
                    onChange={(event) => setRadiologistId(event.target.value)}
                    className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  Patient ID
                  <Input
                    value={patientId}
                    onChange={(event) => setPatientId(event.target.value)}
                    className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm md:col-span-2">
                  Patient Name
                  <Input
                    value={patientName}
                    onChange={(event) => setPatientName(event.target.value)}
                    className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm">
                Scan Reference or URL
                <Input
                  value={scanReference}
                  onChange={(event) => setScanReference(event.target.value)}
                  className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                />
              </label>
              <label className="space-y-2 text-sm">
                Report Title
                <Input
                  value={reportTitle}
                  onChange={(event) => setReportTitle(event.target.value)}
                  className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePredict} disabled={loadingPrediction} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {loadingPrediction ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                  Predict and Draft
                </Button>
                <Button onClick={handleCreateReport} disabled={loadingSave} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                  {loadingSave ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save Draft
                </Button>
                <Button
                  onClick={handleUpdateReport}
                  variant="outline"
                  disabled={loadingSave || !selectedReportId}
                  className="border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800/70"
                >
                  Update Selected
                </Button>
                <Button
                  onClick={handleSendReport}
                  variant="outline"
                  disabled={loadingSend || !selectedReportId}
                  className="border-cyan-500/50 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30"
                >
                  {loadingSend ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send to Patient
                </Button>
                {selectedReport ? (
                  <Button
                    asChild
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/30"
                  >
                    <a
                      href={`/api/reports/${selectedReport.id}/download?asRole=radiologist&asUserId=${encodeURIComponent(radiologistId)}`}
                      download
                    >
                      <Download className="size-4" />
                      Download PDF
                    </a>
                  </Button>
                ) : null}
              </div>

              {prediction ? (
                <p className="rounded-md border border-emerald-500/30 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200">
                  Prediction: {prediction.label} | Confidence: {(prediction.confidence * 100).toFixed(0)}% | Model: {prediction.modelVersion}
                </p>
              ) : null}

              <label className="space-y-2 text-sm">
                Findings
                <Textarea
                  rows={6}
                  value={findings}
                  onChange={(event) => setFindings(event.target.value)}
                  className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                />
              </label>
              <label className="space-y-2 text-sm">
                Advice (one line per item)
                <Textarea
                  rows={5}
                  value={adviceInput}
                  onChange={(event) => setAdviceInput(event.target.value)}
                  className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                />
              </label>

              {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/60 text-zinc-100">
            <CardHeader>
              <CardTitle>My Reports</CardTitle>
              <CardDescription className="text-zinc-400">Draft and sent reports created by this radiologist.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={loadReports}
                disabled={loadingList}
                className="border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800/70"
              >
                {loadingList ? <Loader2 className="size-4 animate-spin" /> : null}
                Refresh
              </Button>

              <div className="space-y-2">
                {reports.length === 0 ? <p className="text-sm text-zinc-500">No reports found.</p> : null}
                {reports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReportId(report.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      report.id === selectedReportId
                        ? "border-emerald-500/70 bg-emerald-900/20"
                        : "border-zinc-700/80 bg-zinc-900/70 hover:bg-zinc-900"
                    }`}
                  >
                    <p className="text-sm font-semibold">{report.reportTitle}</p>
                    <p className="text-xs text-zinc-400">
                      {report.patientName} ({report.patientUserId})
                    </p>
                    <p className="text-xs text-zinc-400">
                      {report.prediction.label} | {(report.prediction.confidence * 100).toFixed(0)}% | {report.status}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
