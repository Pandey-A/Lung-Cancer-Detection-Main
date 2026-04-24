# PulmoCare

AI-assisted lung cancer reporting platform built with Next.js, MongoDB, and a radiologist/patient workflow.

PulmoCare helps a radiologist:
- run AI prediction for a CT scan reference,
- generate a draft report with findings and advice,
- edit and send the report to a patient,
- export a branded hospital PDF,
- support patient follow-up through report-aware chat.

## Highlights

- Radiologist workspace for prediction, draft creation, update, send, and PDF download.
- Patient portal to view only sent reports, download PDF, and ask follow-up questions.
- Role-aware API access using `x-user-role` and `x-user-id`.
- MongoDB-backed storage for reports, users, and chat messages.
- Plug-and-play external deep learning inference via `PREDICTION_URL`.
- Local deterministic fallback prediction when external model is unavailable.

## Tech Stack

- Framework: Next.js 16 (App Router), React 19, TypeScript
- Styling/UI: Tailwind CSS, Radix UI primitives, custom UI components
- Data: MongoDB (`mongodb` Node driver)
- Validation: Zod
- Documents: PDFKit

## Project Structure

```text
app/
	api/
		mock/predict/route.ts            # AI prediction endpoint (external model or local mock fallback)
		reports/route.ts                 # list/create reports
		reports/[id]/route.ts            # update report
		reports/[id]/send/route.ts       # mark report as sent
		reports/[id]/download/route.ts   # generate and download PDF
		reports/[id]/chat/route.ts       # report-specific chat messages
	radiologist/page.tsx               # radiologist UI
	patient/page.tsx                   # patient UI

lib/
	api-auth.ts                        # role/user extraction from request
	mock-prediction.ts                 # inference client + fallback + draft generation
	mongodb.ts                         # Mongo connection helper
	pdf-report.ts                      # hospital-branded PDF generation
	report-types.ts                    # shared report types
	report-serializer.ts               # Mongo document serializer
```

## Roles and Access

- `radiologist`
	- Can run prediction.
	- Can create/edit/send reports.
	- Can download PDFs for own reports.
	- Can access chat for own reports.
- `patient`
	- Can only view reports with status `sent`.
	- Can download PDFs for own sent reports.
	- Can chat only on own sent reports.

Role and identity are passed by headers in the current implementation:

- `x-user-role: radiologist | patient`
- `x-user-id: <string>`

For quick browser testing, many routes also accept query params:

- `asRole`
- `asUserId`

## Deep Learning Model (ImageNet-based) - Short Explanation

PulmoCare is designed to integrate with a real deep learning inference service using `PREDICTION_URL`.

Typical production setup:
- Use a transfer-learning model initialized from ImageNet-pretrained weights (for example, ResNet/EfficientNet backbone).
- Fine-tune the model on medical imaging data (CT/lung dataset) so it learns domain-specific patterns.
- Expose inference as an HTTP endpoint that returns a confidence score and model version.

How PulmoCare consumes it:
1. Radiologist triggers prediction from the UI.
2. Backend posts `scanReference` to `PREDICTION_URL`.
3. Backend expects response fields like `score` or `confidence`.
4. Score is normalized to range `[0, 1]`.
5. Label is derived:
	 - `>= 0.5`: `Cancer Detected`
	 - `< 0.5`: `No Cancer Detected`
6. A draft findings/advice block is auto-generated for clinical editing.

If no external model is configured, the app safely falls back to local mock prediction logic, so the full product flow remains testable end-to-end.

## Environment Variables

Create `.env.local` using the values from `.env.example`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/pulmocare
MONGODB_DB_NAME=pulmocare

# Optional external AI inference endpoint
PREDICTION_URL=

# Optional PDF branding
HOSPITAL_NAME=PulmoCare General Hospital
HOSPITAL_DEPARTMENT=Department of Radiology and Thoracic Imaging
HOSPITAL_ADDRESS=221 Medical District, Health City
HOSPITAL_PHONE=+1 (555) 120-2026
HOSPITAL_EMAIL=radiology@pulmocare-hospital.org
```

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start MongoDB

Use local MongoDB or your cloud instance, and ensure `MONGODB_URI` is reachable.

### 3. Configure environment

Create `.env.local` and set variables shown above.

### 4. Run development server

```bash
pnpm dev
```

Open:
- `http://localhost:3000/radiologist`
- `http://localhost:3000/patient`

## User Flow

1. Radiologist enters patient + scan reference.
2. Clicks **Predict and Draft**.
3. Reviews generated findings/advice.
4. Saves as draft report.
5. Optionally updates report details.
6. Sends report to patient.
7. Patient logs in with patient ID to view sent reports.
8. Patient downloads PDF and can ask report-specific follow-up questions.

## API Overview

### POST `/api/mock/predict`

Run model prediction and generate draft findings.

Request:

```json
{
	"scanReference": "CT-LUNG-2026-04-20-AX001"
}
```

Response:

```json
{
	"prediction": {
		"label": "Cancer Detected",
		"confidence": 0.82,
		"modelVersion": "external-model",
		"score": 0.8241
	},
	"draft": {
		"findings": "...",
		"advice": ["...", "...", "..."]
	}
}
```

### GET `/api/reports`

- Radiologist: gets own reports.
- Patient: gets only own `sent` reports.

### POST `/api/reports`

Create draft report (radiologist only).

### PATCH `/api/reports/:id`

Update report fields (radiologist owner only).

### POST `/api/reports/:id/send`

Mark report as `sent` (radiologist owner only).

### GET `/api/reports/:id/download`

Download generated PDF with hospital branding.

### GET/POST `/api/reports/:id/chat`

Retrieve or append report-scoped chat messages.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## Notes

- Current `script.py` and `solution.py` are unrelated utility/practice scripts and not part of the web app runtime.
- This project provides AI-assisted decision support. Final diagnosis and treatment decisions must remain with qualified medical professionals.
