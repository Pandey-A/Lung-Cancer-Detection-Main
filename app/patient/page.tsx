"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Download, Loader2, SendHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { LungifyReport } from "@/lib/report-types"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  message: string
  createdAt: string
}

export default function PatientPage() {
  const [patientId, setPatientId] = useState("user-001")
  const [reports, setReports] = useState<LungifyReport[]>([])
  const [selectedReportId, setSelectedReportId] = useState("")
  const [chatMessage, setChatMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [statusText, setStatusText] = useState("")
  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || null,
    [reports, selectedReportId],
  )

  async function loadReports() {
    setLoadingReports(true)
    setStatusText("")

    try {
      const res = await fetch("/api/reports", {
        headers: {
          "x-user-role": "patient",
          "x-user-id": patientId,
        },
      })

      const data = await res.json()

      if (!res.ok) {
        setStatusText(data.error || "Unable to fetch reports")
        return
      }

      setReports(data.reports)
      setSelectedReportId(data.reports?.[0]?.id || "")
    } catch {
      setStatusText("Unable to load reports.")
    } finally {
      setLoadingReports(false)
    }
  }

  async function loadChat(reportId: string) {
    if (!reportId) {
      setMessages([])
      return
    }

    setLoadingChat(true)

    try {
      const res = await fetch(`/api/reports/${reportId}/chat`, {
        headers: {
          "x-user-role": "patient",
          "x-user-id": patientId,
        },
      })

      const data = await res.json()

      if (!res.ok) {
        setStatusText(data.error || "Unable to load chat")
        return
      }

      setMessages(data.messages)
    } catch {
      setStatusText("Unable to load chat history.")
    } finally {
      setLoadingChat(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [patientId])

  useEffect(() => {
    if (selectedReportId) {
      void loadChat(selectedReportId)
    }
  }, [selectedReportId])

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedReportId || !chatMessage.trim()) {
      return
    }

    setLoadingChat(true)
    setStatusText("")

    try {
      const res = await fetch(`/api/reports/${selectedReportId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "patient",
          "x-user-id": patientId,
        },
        body: JSON.stringify({ message: chatMessage.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatusText(data.error || "Unable to send message")
        return
      }

      setMessages(data.messages)
      setChatMessage("")
    } catch {
      setStatusText("Unable to send message.")
    } finally {
      setLoadingChat(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Patient Report Portal</h1>
            <p className="text-sm text-zinc-400">View sent reports, download file copies, and ask follow-up questions.</p>
          </div>
          <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/70">
            <Link href="/radiologist">Go to Radiologist Workspace</Link>
          </Button>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-zinc-800/80 bg-zinc-900/60 text-zinc-100">
            <CardHeader>
              <CardTitle>My Reports</CardTitle>
              <CardDescription className="text-zinc-400">Only sent reports are visible to patient role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-2 text-sm">
                Patient ID
                <Input
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                />
              </label>

              <Button
                variant="outline"
                onClick={loadReports}
                disabled={loadingReports}
                className="border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800/70"
              >
                {loadingReports ? <Loader2 className="size-4 animate-spin" /> : null}
                Refresh Reports
              </Button>

              <div className="space-y-2">
                {reports.length === 0 ? <p className="text-sm text-zinc-500">No sent reports available for this ID.</p> : null}
                {reports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReportId(report.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedReportId === report.id
                        ? "border-cyan-500/70 bg-cyan-900/20"
                        : "border-zinc-700/80 bg-zinc-900/70 hover:bg-zinc-900"
                    }`}
                  >
                    <p className="text-sm font-semibold">{report.reportTitle}</p>
                    <p className="text-xs text-zinc-400">{report.patientName}</p>
                    <p className="text-xs text-zinc-400">
                      {report.prediction.label} | {(report.prediction.confidence * 100).toFixed(0)}% confidence
                    </p>
                  </button>
                ))}
              </div>

              {selectedReport ? (
                <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/80 p-3 text-sm">
                  <p className="font-semibold">Findings</p>
                  <p className="mt-1 text-zinc-400">{selectedReport.findings}</p>
                  <p className="mt-3 font-semibold">Advice</p>
                  <ul className="mt-1 list-inside list-disc text-zinc-400">
                    {selectedReport.advice.map((item, idx) => (
                      <li key={`${selectedReport.id}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                  <Button asChild size="sm" className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700">
                    <a
                      href={`/api/reports/${selectedReport.id}/download?asRole=patient&asUserId=${encodeURIComponent(patientId)}`}
                      download
                    >
                      <Download className="size-4" />
                      Download PDF Report
                    </a>
                  </Button>
                </div>
              ) : null}

              {statusText ? <p className="text-sm text-zinc-400">{statusText}</p> : null}
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/60 text-zinc-100">
            <CardHeader>
              <CardTitle>Report Chat Assistant</CardTitle>
              <CardDescription className="text-zinc-400">Ask questions related to your selected report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[360px] overflow-y-auto rounded-lg border border-zinc-700/80 bg-zinc-900/70 p-3">
                {messages.length === 0 ? <p className="text-sm text-zinc-500">No chat messages yet.</p> : null}
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "assistant"
                          ? "bg-cyan-900/35 text-cyan-100 border border-cyan-700/40"
                          : "ml-auto bg-emerald-900/35 text-emerald-100 border border-emerald-700/40"
                      }`}
                    >
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">{msg.role}</p>
                      <p>{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAsk} className="space-y-2">
                <Textarea
                  rows={4}
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Ask about findings, risks, and follow-up steps"
                  className="border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
                />
                <Button type="submit" disabled={!selectedReportId || loadingChat} className="bg-cyan-700 text-white hover:bg-cyan-800">
                  {loadingChat ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
                  Ask Assistant
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
