import jsPDF from 'jspdf'
import type { LogFormSchema } from '../constants/logFormSchema'
import { getSliderQuestions, getToggleQuestions } from '../constants/logFormSchema'
import type { BaselineProfile } from '../types/baseline'
import { SLEEP_QUALITY_LABELS } from '../types/baseline'

// Design tokens
const PRIMARY = [99, 102, 241] as const
const TEXT = [30, 41, 59] as const
const MUTED = [100, 116, 139] as const
const BORDER = [206, 212, 220] as const
const SURFACE = [248, 250, 252] as const

// Layout — generous margins and spacing for handwriting
const PAGE_W = 215.9
const MARGIN = 22
const BOTTOM_MARGIN = 28
const CONTENT_W = PAGE_W - MARGIN * 2

function setColor(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2])
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight()
  if (y + needed > pageH - BOTTOM_MARGIN) {
    doc.addPage()
    doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
    doc.rect(0, 0, PAGE_W, 6, 'F')
    return 16
  }
  return y
}

function sectionHeader(doc: jsPDF, y: number, title: string): number {
  y = ensureSpace(doc, y, 24)
  doc.setFillColor(SURFACE[0], SURFACE[1], SURFACE[2])
  doc.roundedRect(MARGIN, y - 5, CONTENT_W, 12, 2, 2, 'F')
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  doc.rect(MARGIN + 5, y - 1.5, 3, 3, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  setColor(doc, TEXT)
  doc.text(title, MARGIN + 13, y + 2)
  return y + 16
}

interface PatientInfo {
  name: string
  email?: string
  age?: number
  bloodGroup?: string
  allergies?: string
  currentMedications?: string
}

export function downloadLogFormPdf(
  schema: LogFormSchema,
  baseline: BaselineProfile,
  patient: PatientInfo,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Page header ──────────────────────────────────
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  doc.rect(0, 0, PAGE_W, 8, 'F')

  let y = 24
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(20)
  setColor(doc, TEXT)
  doc.text('Daily Health Log', MARGIN, y)

  y += 8
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  setColor(doc, MUTED)
  doc.text('Printable form \u2014 fill in by hand and bring to your appointment', MARGIN, y)

  y += 6
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)

  // ── Patient Info ─────────────────────────────────
  y += 10
  y = sectionHeader(doc, y, 'PATIENT INFORMATION')

  // Single-column layout — one field per row, plenty of room
  const infoFields: [string, string][] = [
    ['Name', patient.name],
    ['Condition', baseline.primaryCondition],
    ['Duration', `${baseline.conditionDurationMonths} months`],
  ]
  if (patient.age) infoFields.push(['Age', `${patient.age}`])
  if (patient.bloodGroup) infoFields.push(['Blood Group', patient.bloodGroup])
  if (patient.allergies) infoFields.push(['Allergies', patient.allergies])
  if (patient.currentMedications) infoFields.push(['Medications', patient.currentMedications])

  for (const [label, value] of infoFields) {
    y = ensureSpace(doc, y, 8)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    setColor(doc, MUTED)
    doc.text(`${label}:`, MARGIN + 5, y)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    setColor(doc, TEXT)
    // Wrap long values (allergies, medications)
    const labelWidth = 32
    const lines: string[] = doc.splitTextToSize(value, CONTENT_W - labelWidth - 10)
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) y += 5
      doc.text(lines[i], MARGIN + labelWidth, y)
    }
    y += 7
  }

  // ── Date field ───────────────────────────────────
  y += 4
  y = ensureSpace(doc, y, 14)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  setColor(doc, TEXT)
  doc.text('Date:', MARGIN + 5, y)
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.setLineWidth(0.4)
  doc.line(MARGIN + 22, y + 1, MARGIN + 90, y + 1)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  setColor(doc, MUTED)
  doc.text(today, MARGIN + 92, y)

  // ── Symptom Ratings ──────────────────────────────
  y += 14
  const sliders = getSliderQuestions(schema)
  if (sliders.length > 0) {
    y = sectionHeader(doc, y, 'SYMPTOM RATINGS')

    doc.setFontSize(8.5)
    setColor(doc, MUTED)
    doc.setFont('Helvetica', 'italic')
    doc.text('Circle the number that best describes each symptom today (0 = none, 10 = worst).', MARGIN + 5, y)
    y += 10

    for (const q of sliders) {
      y = ensureSpace(doc, y, 24)

      // Symptom label
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(10.5)
      setColor(doc, TEXT)
      doc.text(q.label, MARGIN + 5, y)

      // Baseline hint — on its own line below the label
      const baseVal = baseline.responses?.[q.baselineKey ?? q.id]
      if (baseVal !== undefined) {
        y += 5
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(8)
        setColor(doc, MUTED)
        doc.text(`Your baseline: ${baseVal}/10`, MARGIN + 5, y)
      }

      y += 8

      // 0-10 scale with large circles
      const totalScale = 11
      const circleR = 4.5
      const usableW = CONTENT_W - 16
      const spacing = usableW / (totalScale - 1)
      const startX = MARGIN + 8

      for (let n = 0; n <= 10; n++) {
        const cx = startX + n * spacing

        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
        doc.setLineWidth(0.5)
        doc.circle(cx, y, circleR)

        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(9)
        setColor(doc, TEXT)
        const numStr = `${n}`
        const tw = doc.getTextWidth(numStr)
        doc.text(numStr, cx - tw / 2, y + 1.5)
      }

      y += circleR + 10
    }
  }

  // ── Health Check-in ──────────────────────────────
  const toggles = getToggleQuestions(schema)
  if (toggles.length > 0) {
    y += 6
    y = sectionHeader(doc, y, 'HEALTH CHECK-IN')

    doc.setFontSize(8.5)
    setColor(doc, MUTED)
    doc.setFont('Helvetica', 'italic')
    doc.text('Check the box if you experienced any of the following today:', MARGIN + 5, y)
    y += 10

    for (const q of toggles) {
      y = ensureSpace(doc, y, 12)

      // Large checkbox
      doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
      doc.setLineWidth(0.5)
      doc.rect(MARGIN + 7, y - 4, 5, 5)

      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(10)
      setColor(doc, TEXT)
      doc.text(q.label, MARGIN + 17, y)

      y += 10
    }
  }

  // ── Sleep ────────────────────────────────────────
  y += 6
  y = sectionHeader(doc, y, 'SLEEP')

  // Hours slept
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  setColor(doc, TEXT)
  doc.text('Hours Slept:', MARGIN + 5, y)
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.setLineWidth(0.4)
  doc.line(MARGIN + 36, y + 1, MARGIN + 65, y + 1)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  setColor(doc, MUTED)
  doc.text(`(baseline: ${baseline.sleepHours}h)`, MARGIN + 67, y)
  y += 12

  // Sleep quality — circle one
  y = ensureSpace(doc, y, 24)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  setColor(doc, TEXT)
  doc.text('Sleep Quality (circle one):', MARGIN + 5, y)
  y += 9

  const qStartX = MARGIN + 10
  const qSpacing = (CONTENT_W - 24) / 4
  for (let n = 1; n <= 5; n++) {
    const cx = qStartX + (n - 1) * qSpacing

    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    doc.setLineWidth(0.5)
    doc.circle(cx, y, 4)

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8)
    setColor(doc, TEXT)
    const numStr = `${n}`
    const tw = doc.getTextWidth(numStr)
    doc.text(numStr, cx - tw / 2, y + 1.5)

    // Label below circle
    doc.setFontSize(7)
    setColor(doc, MUTED)
    const label = SLEEP_QUALITY_LABELS[n] ?? ''
    const lw = doc.getTextWidth(label)
    doc.text(label, cx - lw / 2, y + 9)
  }
  y += 18

  // Bedtime / Wake time — stacked, not cramped side-by-side
  y = ensureSpace(doc, y, 20)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  setColor(doc, TEXT)
  doc.text('Bedtime:', MARGIN + 5, y)
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.line(MARGIN + 28, y + 1, MARGIN + 65, y + 1)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  setColor(doc, MUTED)
  doc.text(`(usual: ${baseline.usualBedtime ?? ''})`, MARGIN + 67, y)
  y += 10

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  setColor(doc, TEXT)
  doc.text('Wake Time:', MARGIN + 5, y)
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.line(MARGIN + 32, y + 1, MARGIN + 65, y + 1)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  setColor(doc, MUTED)
  doc.text(`(usual: ${baseline.usualWakeTime ?? ''})`, MARGIN + 67, y)

  // ── Notes ────────────────────────────────────────
  y += 14
  y = sectionHeader(doc, y, 'NOTES')

  doc.setFontSize(8.5)
  setColor(doc, MUTED)
  doc.setFont('Helvetica', 'italic')
  doc.text('New symptoms, medication changes, or anything you want your doctor to know:', MARGIN + 5, y)
  y += 8

  // Generous ruled lines — 12mm apart for comfortable handwriting
  for (let i = 0; i < 6; i++) {
    y = ensureSpace(doc, y, 12)
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    doc.setLineWidth(0.2)
    doc.line(MARGIN + 5, y, MARGIN + CONTENT_W - 5, y)
    y += 12
  }

  // ── Footers ──────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  const pageH = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    doc.setLineWidth(0.3)
    doc.line(MARGIN, pageH - 16, MARGIN + CONTENT_W, pageH - 16)
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(7.5)
    setColor(doc, MUTED)
    const footer = `CareConsole.ai  \u2022  Page ${i} of ${totalPages}  \u2022  Generated ${today}`
    const fw = doc.getTextWidth(footer)
    doc.text(footer, (PAGE_W - fw) / 2, pageH - 11)
  }

  const dateSlug = new Date().toISOString().split('T')[0]
  doc.save(`daily-log-form-${dateSlug}.pdf`)
}
