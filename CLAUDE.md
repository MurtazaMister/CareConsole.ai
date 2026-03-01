# Project Context – HackRare Baseline & Flare Detection Dashboard

## Overview

We are building a patient-centered health dashboard designed to support **early flare detection** for individuals managing chronic or rare conditions.

The system will allow users to:

* Define their personal health baseline
* Track deviations from their usual condition
* Identify patterns that may indicate the onset of a flare
* Visualize their health trends over time
* Improve self-awareness and proactive care decisions

This project is intended to be:

* Simple and intuitive for patients
* Clinically meaningful
* Scalable for future AI-driven insights
* Demo-ready for hackathon evaluation

---

## Core Concept

The foundation of the system is the **Baseline Profile**.

A baseline represents a user’s “normal” state — not their best day and not their worst day, but their usual condition.

All future symptom tracking and flare detection logic will compare against this baseline.

The dashboard will serve as:

* A centralized view of the user’s baseline
* A starting point for symptom logging
* A reference system for detecting deviations
* A clean, accessible health interface

---

## Product Direction

This project aims to:

* Shift from reactive symptom reporting to proactive flare detection
* Reduce cognitive load for patients
* Make daily health tracking frictionless
* Provide meaningful comparisons instead of raw numbers
* Lay the groundwork for intelligent alerts in future phases

The system should feel:

* Calm
* Medical-grade but friendly
* Empowering
* Data-informed but not overwhelming

---

## Development Rules

* The system must strictly follow `plan.md` for feature implementation.
* Do not add features beyond what is defined in `plan.md`.
* Keep implementation modular and scalable.
* Focus on clarity over complexity.
* Prioritize user experience and simplicity.

`plan.md` is the source of truth for feature scope and task breakdown.

---

## Current Phase

All 9 phases are complete:

1. **Baseline Setup** — 4-step onboarding wizard
2. **Daily Logging** — Multi-step log form with date picker
3. **Dashboard & Visualization** — Tabbed dashboard with Overview and History
4. **Authentication & Profile** — Express + MongoDB backend, JWT auth, medical profile
5. **Interactive Charts** — Recharts: symptom trends, deviation, radar, sleep
6. **Risk Label Removal** — Neutral language throughout
7. **Seed Data** — 5 test users with realistic disease patterns
8. **Flare Detection & Insights** — Z-Score + EWMA + composite scoring engine, Insights tab
9. **AI Reports** — GPT-4o-mini clinician summaries, plain-language insights, doctor questions

---

This document provides context only.
See `docs/` for detailed documentation: features, architecture, flare detection algorithm, AI reports, and development progress.
