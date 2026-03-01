import jsPDF from 'jspdf'
import type { AIReport } from '../types/aiReport'

// Design tokens
const PRIMARY = [99, 102, 241] as const    // #6366f1
const TEXT = [30, 41, 59] as const         // #1e293b
const MUTED = [100, 116, 139] as const     // #64748b
const BORDER = [226, 232, 240] as const    // #e2e8f0
const SURFACE = [248, 250, 252] as const   // #f8fafc

// Layout constants
const PAGE_W = 215.9
const MARGIN = 20
const BOTTOM_MARGIN = 25
const CONTENT_W = PAGE_W - MARGIN * 2
const BODY_SIZE = 10
const LINE_H = 5.5
const SECTION_HEADER_SIZE = 13
const HEADER_BAR_H = 8

function setColor(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2])
}

function renderHeaderBar(doc: jsPDF, isFirstPage: boolean): number {
  // Full-width indigo bar
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  doc.rect(0, 0, PAGE_W, HEADER_BAR_H, 'F')

  if (!isFirstPage) {
    // Slim continuation: just the bar, return a modest Y
    return HEADER_BAR_H + 10
  }

  // Title
  let y = HEADER_BAR_H + 14
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  setColor(doc, TEXT)
  doc.text('HackRare Health Report', MARGIN, y)

  // Generated date
  y += 7
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  setColor(doc, MUTED)
  doc.text(generatedLabel, MARGIN, y)

  // Thin accent line
  y += 5
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)

  y += 8
  return y
}

// Module-level variable set before rendering starts
let generatedLabel = ''

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight()
  if (y + needed > pageH - BOTTOM_MARGIN) {
    doc.addPage()
    return renderHeaderBar(doc, false)
  }
  return y
}

function renderSectionHeader(doc: jsPDF, y: number, title: string): number {
  // Background strip
  doc.setFillColor(SURFACE[0], SURFACE[1], SURFACE[2])
  doc.roundedRect(MARGIN, y - 4, CONTENT_W, 10, 1.5, 1.5, 'F')

  // Indigo square bullet
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  doc.rect(MARGIN + 4, y - 1.5, 3, 3, 'F')

  // Title text
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(SECTION_HEADER_SIZE)
  setColor(doc, TEXT)
  doc.text(title.toUpperCase(), MARGIN + 11, y + 1.5)

  return y + 12
}

function renderWrappedText(doc: jsPDF, y: number, text: string): number {
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(BODY_SIZE)
  setColor(doc, TEXT)

  // Split into paragraphs
  const paragraphs = text.split(/\n\n|\n/)

  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p].trim()
    if (!para) continue

    const lines: string[] = doc.splitTextToSize(para, CONTENT_W)
    for (const line of lines) {
      y = ensureSpace(doc, y, LINE_H)
      doc.text(line, MARGIN, y)
      y += LINE_H
    }
    // Extra space between paragraphs
    if (p < paragraphs.length - 1) {
      y += 2
    }
  }
  return y
}

/** Detect if a line is an ALL-CAPS sub-header (e.g. "PATIENT SUMMARY", "SYMPTOM TRENDS:") */
function isSubHeader(line: string): boolean {
  const cleaned = line.replace(/[:\-\s]/g, '')
  return cleaned.length >= 3 && cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned)
}

function renderSubHeader(doc: jsPDF, y: number, title: string): number {
  // Strip trailing colon/dash for display
  const label = title.replace(/[:\-]+\s*$/, '').trim()

  y = ensureSpace(doc, y, 12)

  // Small indigo accent dot
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
  doc.circle(MARGIN + 1.5, y - 1.2, 1, 'F')

  // Bold sub-header text
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10.5)
  setColor(doc, TEXT)
  doc.text(label, MARGIN + 6, y)

  return y + 6.5
}

/** Renders clinical text with sub-header detection for structured sections */
function renderClinicalText(doc: jsPDF, y: number, text: string): number {
  const paragraphs = text.split(/\n\n|\n/)
  let isFirst = true

  for (const raw of paragraphs) {
    const para = raw.trim()
    if (!para) continue

    if (isSubHeader(para)) {
      // Add extra spacing before sub-headers (except first)
      if (!isFirst) y += 3
      y = renderSubHeader(doc, y, para)
      isFirst = false
      continue
    }

    // Body text under the sub-header
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(BODY_SIZE)
    setColor(doc, TEXT)

    const lines: string[] = doc.splitTextToSize(para, CONTENT_W - 6)
    for (const line of lines) {
      y = ensureSpace(doc, y, LINE_H)
      doc.text(line, MARGIN + 6, y)
      y += LINE_H
    }
    y += 1.5
    isFirst = false
  }
  return y
}

function renderNumberedList(doc: jsPDF, y: number, items: string[]): number {
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(BODY_SIZE)
  setColor(doc, TEXT)

  const indent = 8
  const textW = CONTENT_W - indent

  for (let i = 0; i < items.length; i++) {
    const prefix = `${i + 1}. `
    const lines: string[] = doc.splitTextToSize(prefix + items[i], textW)

    for (let j = 0; j < lines.length; j++) {
      y = ensureSpace(doc, y, LINE_H)
      doc.text(lines[j], MARGIN + (j === 0 ? 0 : indent), y)
      y += LINE_H
    }
    // Space between items
    if (i < items.length - 1) {
      y += 2
    }
  }
  return y
}

function renderSeparator(doc: jsPDF, y: number): number {
  y = ensureSpace(doc, y, 6)
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  return y + 6
}

function renderDisclaimer(doc: jsPDF, y: number, text: string): number {
  doc.setFont('Helvetica', 'italic')
  doc.setFontSize(8)
  setColor(doc, MUTED)

  const lines: string[] = doc.splitTextToSize(text, CONTENT_W)
  for (const line of lines) {
    y = ensureSpace(doc, y, 4.5)
    doc.text(line, MARGIN, y)
    y += 4.5
  }
  return y
}

function renderFooters(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages()
  const pageH = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Footer separator
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2])
    doc.setLineWidth(0.3)
    doc.line(MARGIN, pageH - 15, MARGIN + CONTENT_W, pageH - 15)

    // Footer text
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8)
    setColor(doc, MUTED)

    const footerText = `HackRare  \u2022  Page ${i} of ${totalPages}  \u2022  ${generatedLabel}`
    const footerWidth = doc.getTextWidth(footerText)
    doc.text(footerText, (PAGE_W - footerWidth) / 2, pageH - 10)
  }
}

export function downloadReportPdf(report: AIReport): void {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })

  // Set up the generated label
  const dt = new Date(report.generatedAt)
  const dateStr = dt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = dt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  generatedLabel = `Generated ${dateStr} at ${timeStr}`

  // Page 1 header
  let y = renderHeaderBar(doc, true)

  // Section: What's Happening
  // Check room for header + ~3 lines
  y = ensureSpace(doc, y, 28)
  y = renderSectionHeader(doc, y, "What's Happening")
  y = renderWrappedText(doc, y, report.plainLanguageSummary)

  y += 4
  y = renderSeparator(doc, y)

  // Section: Questions for Your Doctor
  y = ensureSpace(doc, y, 28)
  y = renderSectionHeader(doc, y, 'Questions for Your Doctor')
  y = renderNumberedList(doc, y, report.suggestedQuestions)

  y += 4
  y = renderSeparator(doc, y)

  // Section: Clinician Summary
  y = ensureSpace(doc, y, 28)
  y = renderSectionHeader(doc, y, 'Clinician Summary')
  y = renderClinicalText(doc, y, report.clinicianSummary)

  y += 4
  y = renderSeparator(doc, y)

  // Disclaimer
  y = ensureSpace(doc, y, 15)
  renderDisclaimer(doc, y, report.disclaimer)

  // Footer on all pages
  renderFooters(doc)

  // Save
  const dateSlug = report.generatedAt.split('T')[0]
  doc.save(`health-report-${dateSlug}.pdf`)
}
