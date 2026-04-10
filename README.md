# Receipt Scanner

A serverless web app that extracts structured data from receipt images and PDFs. Upload receipts, get back itemized line items, merchant info, and totals — ready to export as CSV or JSON.

## Overview

Users upload receipt photos (including HEIC from iPhones), PDFs, or standard images. The frontend converts HEIC files to JPEG in-browser, then sends files directly to S3 via presigned URLs. AWS processes the files and pushes extracted receipt data back to the user in real time over a WebSocket.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (React)                           │
│                                                                  │
│  1. Open page → establish WebSocket connection                   │
│  2. Select receipts → send getPresignedUrl action                │
│  3. Receive presigned URLs → PUT files directly to S3            │
│  4. Wait → receive extracted data over WebSocket                 │
└──────────────┬────────────────────────────────┬─────────────────┘
               │ WebSocket (WSS)                │ PUT (HTTPS)
               ▼                                ▼
┌──────────────────────┐          ┌─────────────────────────┐
│  API Gateway         │          │  S3 Upload Bucket        │
│  (WebSocket API)     │          │  (raw receipts)          │
└──────┬───────────────┘          └────────────┬────────────┘
       │ trigger                               │ trigger
       ▼                                       ▼
┌──────────────────────┐          ┌─────────────────────────┐
│  Lambda              │          │  AWS GuardDuty           │
│  (presigned URL gen) │          │  (malware scan)          │
│                      │          └────────────┬────────────┘
│  - Validates file    │                       │ clean files
│    metadata          │                       ▼
│  - Generates S3      │          ┌─────────────────────────┐
│    presigned PUT URL │          │  S3 Clean Bucket         │
│  - Returns URLs via  │          │  (verified receipts)     │
│    WebSocket         │          └────────────┬────────────┘
└──────────────────────┘                       │ trigger
                                               ▼
                                  ┌─────────────────────────┐
                                  │  Lambda                  │
                                  │  (text extraction / OCR) │
                                  │                          │
                                  │  - Extracts merchant,    │
                                  │    total, line items     │
                                  │  - Pushes result to      │
                                  │    browser via WebSocket │
                                  │    (connectionId stored  │
                                  │    in S3 object metadata)│
                                  └──────────────────────────┘
```

### Data flow in detail

1. The browser opens a persistent WebSocket to API Gateway on page load.
2. When the user submits receipts, the frontend sends a `getPresignedUrl` action over the WebSocket with each file's name, type, and size.
3. A Lambda validates the file metadata and returns presigned S3 `PUT` URLs for each file via the WebSocket.
4. The browser uploads files directly to S3, embedding the WebSocket `connectionId` and a client-generated `fileId` in S3 object metadata (`x-amz-meta-connectionId`, `x-amz-meta-fileId`).
5. GuardDuty scans the uploaded files for malware. Files that pass move to the clean S3 bucket.
6. A second Lambda, triggered by the clean bucket, runs text extraction/OCR on each receipt and parses the output into structured JSON (merchant, total, line items).
7. The extraction Lambda reads the `connectionId` from the object metadata and pushes the result back to the correct browser session via the API Gateway WebSocket Management API.

---

## Serverless Design

All backend compute runs on AWS Lambda with no persistent servers. This decision was made for a few reasons:

**No idle cost.** Receipt scanning is bursty — users don't upload receipts continuously. Lambda charges only for actual invocations, so cost scales directly with usage.

**Direct S3 upload via presigned URLs.** Files never pass through Lambda. This sidesteps Lambda's 10 MB payload limit and avoids paying for compute time spent on raw file transfer. The Lambda only handles lightweight metadata to generate the URL.

**GuardDuty for upload security.** Because users upload arbitrary files, GuardDuty provides automatic malware scanning before any processing Lambda ever touches the content. Only files that pass scanning reach the extraction stage.

**WebSocket for real-time results.** Text extraction can take a few seconds per receipt. Rather than polling an endpoint, the frontend holds an open WebSocket connection. The extraction Lambda pushes results directly to the user's session as soon as each receipt is done, using the `connectionId` stored in the S3 object metadata at upload time.

---

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- AWS account with the backend infrastructure deployed
- AWS API Gateway WebSocket URL

### Frontend

```bash
cd Frontend
npm install
```

Create a `.env.local` file:

```env
VITE_SOCKET_GATEWAY_URL=wss://<your-api-gateway-id>.execute-api.<region>.amazonaws.com/<stage>
```

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Backend Lambda (local testing)

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:

```env
BUCKET_NAME=your-upload-bucket-name
AWS_REGION=us-west-1
# Optional — omit in production and rely on IAM role
ACCESS_KEY=your-access-key
SECRET_KEY=your-secret-key
```

Run the presigned URL Lambda locally with its built-in test harness:

```bash
python accept-files-best.py
```

This invokes `lambda_handler` with a sample payload and prints the response, including the generated presigned URLs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| File handling | heic2any (HEIC → JPEG in-browser), UUID per receipt |
| Backend compute | AWS Lambda (Python 3.11) |
| Storage | Amazon S3 |
| Security scanning | AWS GuardDuty |
| Real-time comms | AWS API Gateway WebSocket API |
| AWS SDK | boto3 |
| Export | CSV, JSON (client-side generation) |
