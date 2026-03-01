# AI Report Generation

The Reports tab generates AI-powered health reports using OpenAI GPT-4o-mini. This document explains how it works end-to-end.

## Why GPT-4o-mini?

We needed a model that can reason well from structured medical data but doesn't burn through tokens. GPT-4o-mini hits that sweet spot — it handles the clinical context and produces well-structured output at a fraction of the cost of larger models (less than $0.001 per report).

## Data Flow

```
1. User clicks "Generate Report" in the Reports tab

2. Frontend collects flare engine results (already computed client-side):
   - Current flare status, trend direction, streak
   - All detected flare windows (dates, severity, peak scores)
   - Last 14 days of daily composite scores + top contributing symptoms

3. Frontend sends POST /api/ai/generate with this flare data

4. Backend (aiController.ts):
   a. Validates the request (flare data present, user authenticated)
   b. Fetches from MongoDB IN PARALLEL:
      - User profile (age, medications, allergies, blood group)
      - Baseline profile (condition, symptom baselines, sleep)
      - Last 14 daily logs (symptoms, sleep, health check-ins, notes)
   c. Builds a structured user message combining DB data + client flare analysis
   d. Calls OpenAI with system prompt + user message

5. OpenAI returns JSON with 3 fields:
   - clinicianSummary (structured clinical text)
   - plainLanguageSummary (patient-friendly explanation)
   - suggestedQuestions (3-5 data-driven questions)

6. Backend adds timestamp + disclaimer, returns to frontend

7. Frontend renders the 3 sections with copy/download controls
```

## Security Model

- **API key stays on the server.** The OpenAI key is in `server/.env`, loaded via `env.ts`, never exposed to the browser.
- **Auth required.** The `/api/ai/generate` endpoint goes through `authMiddleware` — no valid JWT cookie, no report.
- **Server fetches authoritative data.** The backend reads baseline, logs, and profile directly from MongoDB using `req.userId`. Even if someone manipulates the client-sent flare analysis, the core patient data comes from the database.
- **No data storage.** Reports are generated on-demand and returned immediately. They are never saved to the database.

## What the AI Sees

The system prompt instructs GPT-4o-mini to act as a medical AI assistant. It receives:

### Patient Profile
Age, blood group, allergies, current medications, primary condition, condition duration.

### Baseline Metrics
The user's "normal" state for all 4 symptoms (pain, fatigue, breathing, function), plus sleep hours, quality, bedtime, and wake time.

### Recent Daily Logs (last 14 days)
For each day: all 4 symptom values, sleep hours and quality, any health check-in flags (chest pain/weakness, fever/chills, missed medication), and notes.

### Flare Engine Analysis
Current status and streak, trend direction, total flare windows and flare days, most affected symptom, average composite score. Plus details for each flare window (dates, severity, peak, dominant symptom) and recent daily composite scores with top contributing symptoms.

## What the AI Produces

### 1. Clinician Summary (max 400 words)
A structured report using section headers (PATIENT SUMMARY, SYMPTOM TRENDS, SLEEP ANALYSIS, ALERTS, OBSERVATIONS). Written with appropriate medical terminology. Always includes specific numbers from the data (e.g., "pain averaged 6.2/10 vs baseline of 3/10"). Health check-in flags (chest pain, fever, missed meds) are prominently highlighted.

### 2. Plain Language Summary (max 150 words)
Warm, clear, jargon-free. Explains what the data shows in relatable terms. Highlights what's going well and what needs attention. The tone is calm and empowering.

### 3. Suggested Questions (3-5)
Context-aware questions the patient can ask at their next doctor visit. Each references specific data points. Designed to help patients advocate for their care.

## API Call Parameters

```
Model:           gpt-4o-mini
Response format: JSON object (enforced by OpenAI — guaranteed valid JSON)
Temperature:     0.3 (low for consistent, factual output)
Max tokens:      1500 (sufficient for all 3 sections)
```

## Error Handling

| Scenario | What happens |
|----------|-------------|
| No baseline | 400: "Baseline is required before generating a report" |
| < 3 logs | 400: "At least 3 daily logs are required" |
| OpenAI rate limit | 429: "AI service rate limit reached. Please try again in a moment." |
| OpenAI down / timeout | 502: "Failed to generate report. Please try again." |
| Malformed AI response | 502: "AI returned an incomplete response" |
| Missing API key | Server won't start (env.ts `required()` throws on boot) |

The frontend shows all errors with a "Try Again" button and a "Go Back" button to return to the idle state.

## Key Files

| File | Role |
|------|------|
| `server/src/controllers/aiController.ts` | Prompt construction, OpenAI call, response parsing |
| `server/src/routes/ai.ts` | Express router (POST /generate) |
| `server/src/config/env.ts` | OPENAI_API_KEY environment variable |
| `src/types/aiReport.ts` | TypeScript interfaces for request/response |
| `src/hooks/useAIReport.ts` | State machine hook (idle/loading/success/error) |
| `src/components/ReportsTab.tsx` | Main tab with all render states + export controls |
| `src/components/reports/ReportSection.tsx` | Reusable card with copy button |
