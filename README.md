# F3 Status Report Generator – PM Co-pilot

> **Course:** ISAN 5365 · Generative AI for Business  
> **Instructor:** Dr. Ju Long  
> **Author:** Sneha Tulshiram Nitnaware  

An AI-powered co-pilot that generates audience-specific weekly project status reports for Project Managers — in under 10 minutes instead of 45–90.

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![Tests](https://img.shields.io/badge/Tests-42%20passed-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## What It Does

F3 takes one structured input form and generates three audience-specific status reports:

| Audience | Tone | Word Limit |
|----------|------|------------|
| 👔 **Executive** | High-level, strategic, RAG status | ≤ 300 words |
| 🤝 **Client** | Plain language, client-safe, reassuring | Standard |
| 🏗️ **Site Team** | Operational detail, dates, % complete, actions | Comprehensive |

### Key Features (Iterations 1–8)

| Feature | Iteration |
|---------|-----------|
| Five-section report structure | 1 |
| Audience-specific rules + CONFIRM placeholders | 1–2 |
| PMO Guidelines (RAG status, tone standards) | 2 |
| Schedule CSV integration (task lookup + delay calc) | 3 |
| Golden Dataset QA + out-of-bounds error handling | 4 |
| THOUGHT PROCESS explainability block | 5 |
| Human-in-the-Loop GO / NO-GO Approval Gate | 6 |
| Hard governance guardrails (8 adversarial tests: all pass) | 7 |
| Enterprise ROI model ($392K net annual benefit) | 8 |

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/pm-copilot.git
cd pm-copilot
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — add your Anthropic API key to enable AI mode
# Leave blank to run in Demo Mode (no API key required)
```

### 3. Run

```bash
python app.py
# Open http://localhost:5000
```

---

## Two Modes

### 🎭 Demo Mode (no API key)
Works out of the box. A rule-based engine generates realistic, PMO-grounded reports using your inputs and the schedule CSV. All guardrails, the THOUGHT PROCESS block, and the GO/NO-GO gate are fully functional.

### 🤖 AI Mode (Anthropic API key)
Set `ANTHROPIC_API_KEY` in `.env`. F3 calls Claude to generate reports using the full system prompt encoding all iteration rules.

---

## Project Structure

```
pm-copilot/
├── app.py                          # Flask backend + report engine
├── requirements.txt
├── .env.example                    # Config template
├── knowledge_base/
│   ├── pmo_guidelines.md           # PMO RAG + tone standards (Iter 2)
│   └── example_reports/            # Reference reports for grounding
│       ├── executive_example.md
│       ├── client_example.md
│       └── site_team_example.md
├── skills/
│   ├── schedule_lookup.py          # Project Schedule Lookup skill (Iter 3)
│   └── schedule_delay_helper.py    # Schedule Delay Helper skill (Iter 3)
├── data/
│   └── sample_schedule.csv         # Harmon Corp 10-task sample schedule
├── static/
│   ├── css/style.css               # Dark-mode UI
│   └── js/app.js                   # Frontend logic
├── templates/
│   └── index.html                  # Single-page app
└── tests/
    └── test_f3.py                  # 42 tests covering all iterations
```

---

## Running Tests

```bash
python -m pytest tests/ -v
```

**42 tests cover:**
- 10 guardrail tests (8 adversarial categories from Iteration 7)
- 9 schedule lookup + delay helper tests (Iteration 3)
- 5 THOUGHT PROCESS / explainability tests (Iteration 5)
- 8 report structure tests (Iterations 1–2)
- 4 Golden Dataset tests (Iteration 4)

---

## How It Works

### Workflow

```
PM fills form → F3 analyzes → THOUGHT PROCESS shown →
Approval Gate (GO/NO-GO) → PM approves → Report generated
```

### THOUGHT PROCESS Block (Iteration 5)
Before every report, F3 shows:
- **User Intent** – what it understood the PM wants
- **Retrieval Strategy** – which sources it will use
- **Confidence** – High / Medium / Low, with reason
- **Scope Boundaries** – what the report will NOT cover

### Human-in-the-Loop Gate (Iteration 6)
F3 pauses after the THOUGHT PROCESS and requires an explicit **GO** from the PM before generating the report. On **NO-GO**, it returns to the input form.

### Hard Guardrails (Iteration 7 – Section 11)
Six non-negotiable rules prevent:
1. PII exfiltration
2. System prompt disclosure
3. Legal / medical / HR advice
4. Discriminatory filtering
5. Security bypass instructions
6. Skipping the HITL gate

---

## Schedule CSV Format

Upload any CSV with these columns (see `data/sample_schedule.csv` for example):

```
Task ID, Task Name, Duration (days), Start Date, End Date, % Complete, Cost ($), Work (hrs), Status
```

**Status values:** `Complete`, `On Track`, `At Risk`, `Delayed`, `Not Started`

---

## Enabling AI Mode

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart: `python app.py`

The banner at the top of the app shows which mode is active.

---

## Enterprise Business Case (Iteration 8)

| Metric | Value |
|--------|-------|
| Users | 100 PMs |
| Time saved | 30 min/day → 250 hrs/week |
| Annual value | ~$520,000 |
| Annual TCO | ~$128,000 |
| **Net annual benefit** | **~$392,000** |
| **ROI** | **3.1×** |
| **Payback** | **~3 months** |

---

## License

MIT License – see [LICENSE](LICENSE) for details.

---

*Built with Python, Flask, and the Anthropic Claude API.*  
*ISAN 5365 – Generative AI for Business · 2026*
