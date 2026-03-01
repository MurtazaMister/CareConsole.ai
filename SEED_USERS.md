# Seed Users

Run `npx ts-node src/seed.ts` from `server/` to populate.

## Patient Accounts

| Username | Email | Password | Disease | Days |
|----------|-------|----------|---------|------|
| sarah | sarah@hackrare.com | sarah123 | Systemic Lupus Erythematosus (SLE) | 90 |
| marcus | marcus@hackrare.com | marcus123 | Pulmonary Arterial Hypertension (PAH) | 60 |
| priya | priya@hackrare.com | priya123 | Hypermobile Ehlers-Danlos Syndrome (hEDS) | 90 |
| james | james@hackrare.com | james123 | Myasthenia Gravis | 45 |
| elena | elena@hackrare.com | elena123 | Systemic Sclerosis (Scleroderma) | 30 |

## Doctor Accounts

| Username | Email | Password | Clients |
|----------|-------|----------|---------|
| dr_chen | dr.chen@hackrare.com | drchen123 | sarah, priya, elena |
| dr_okafor | dr.okafor@hackrare.com | drokafor123 | marcus, james |

### dr_chen — Rheumatologist

Manages patients with autoimmune and connective tissue conditions. Has read-access to baseline, daily logs, schema, and flare insights for each assigned patient.

- **sarah** — SLE (90 days of logs)
- **priya** — hEDS (90 days of logs)
- **elena** — Scleroderma (30 days of logs)

### dr_okafor — Pulmonologist / Neurologist

Manages patients with cardiopulmonary and neuromuscular conditions.

- **marcus** — PAH (60 days of logs)
- **james** — Myasthenia Gravis (45 days of logs)

## Disease Patterns

### Sarah — SLE (90 days)

Autoimmune with flare-remission cycles. Triggered by UV, stress, missed meds.

- **Days 1-19**: Stable, minor fluctuations
- **Days 20-25**: Flare buildup — joint pain, missed HCQ dose, butterfly rash
- **Days 26-32**: Full flare — fever 38.4C, prednisone burst started
- **Days 33-46**: Slow recovery, prednisone taper
- **Days 47-65**: Second stable period
- **Days 66-73**: Minor stress-triggered flare
- **Days 74-90**: Return to baseline

Dominant symptoms: fatigue, joint pain. Breathing mild unless pleuritis.

### Marcus — PAH (60 days)

Progressive pulmonary pressure. Breathing-dominant.

- **Days 1-21**: Gradual worsening — more winded, ankle edema
- **Days 22-33**: Episode peak — SOB at rest, ER visit, started Sildenafil
- **Days 34-46**: Medication response, steady improvement
- **Days 47-60**: New stable (slightly above original baseline)

Dominant symptoms: breathing difficulty, exercise intolerance, fatigue.

### Priya — hEDS (90 days)

Connective tissue disorder. Highly variable day-to-day.

- Cluster flares every ~20 days (days 16-21, 39-45, 61-67)
- ~15% random bad days (subluxations, overexertion payback)
- ~20% random good days
- Triggers: physical activity, weather changes, hormonal cycles

Dominant symptoms: chronic pain, functional limitation. Breathing unaffected.

### James — Myasthenia Gravis (45 days)

Neuromuscular autoimmune. Muscle weakness worsens with activity.

- **Days 1-13**: Fluctuating baseline — ptosis, swallowing difficulty
- **Days 14-23**: Exacerbation — breathing crisis, ER, IVIG treatment
- **Days 24-36**: Post-IVIG recovery
- **Days 37-45**: Near-baseline, stable

Dominant symptoms: fatigue, functional limitation. Pain low. Breathing risk during crisis.

### Elena — Scleroderma (30 days)

Autoimmune affecting skin/vessels/organs. Cold-triggered Raynaud's.

- **Days 1-9**: Learning to track, stable
- **Days 10-19**: Cold snap — Raynaud's flare, digital ulcer, started Nifedipine
- **Days 20-30**: Gradual improvement with warming weather

Dominant symptoms: pain (skin tightening), breathing (lung involvement), fatigue.

## Baseline Values

| User | Pain | Fatigue | Breathing | Functional | Sleep | Quality |
|------|------|---------|-----------|------------|-------|---------|
| sarah | 4 | 5 | 2 | 3 | 7h | 3/5 |
| marcus | 2 | 4 | 5 | 4 | 6h | 3/5 |
| priya | 5 | 4 | 1 | 4 | 6h | 2/5 |
| james | 2 | 6 | 3 | 5 | 7h | 3/5 |
| elena | 4 | 5 | 4 | 3 | 6h | 3/5 |
