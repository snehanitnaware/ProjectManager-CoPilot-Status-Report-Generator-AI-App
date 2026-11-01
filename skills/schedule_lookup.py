"""
Skill: Project Schedule Lookup
Purpose: Fetch task data from the uploaded schedule CSV for grounded report generation.
Triggered when report sections reference a specific task name (e.g., "Structural steel installed").
"""

import csv
import io
from datetime import datetime, date
from typing import Optional


def parse_schedule_csv(csv_content: str) -> list[dict]:
    """Parse CSV content into a list of task dictionaries."""
    tasks = []
    reader = csv.DictReader(io.StringIO(csv_content))
    for row in reader:
        task = {
            "task_id": row.get("Task ID", "").strip(),
            "task_name": row.get("Task Name", "").strip(),
            "duration": row.get("Duration (days)", "").strip(),
            "start_date": row.get("Start Date", "").strip(),
            "end_date": row.get("End Date", "").strip(),
            "pct_complete": row.get("% Complete", "0").strip(),
            "cost": row.get("Cost ($)", "").strip(),
            "work_hrs": row.get("Work (hrs)", "").strip(),
            "status": row.get("Status", "").strip(),
        }
        tasks.append(task)
    return tasks


def lookup_task(tasks: list[dict], task_name_query: str) -> Optional[dict]:
    """
    Find a task by partial name match (case-insensitive).
    Returns the best-matching task or None.
    """
    query = task_name_query.lower()
    for task in tasks:
        if query in task["task_name"].lower():
            return task
    # Fuzzy: check word overlap
    query_words = set(query.split())
    best_match = None
    best_score = 0
    for task in tasks:
        task_words = set(task["task_name"].lower().split())
        score = len(query_words & task_words)
        if score > best_score:
            best_score = score
            best_match = task
    return best_match if best_score > 0 else None


def get_schedule_summary(tasks: list[dict]) -> dict:
    """Return aggregate summary stats from the full schedule."""
    total = len(tasks)
    complete = sum(1 for t in tasks if t["status"] == "Complete")
    at_risk = sum(1 for t in tasks if t["status"] == "At Risk")
    delayed = sum(1 for t in tasks if t["status"] == "Delayed")
    on_track = sum(1 for t in tasks if t["status"] == "On Track")
    not_started = sum(1 for t in tasks if t["status"] == "Not Started")

    total_cost = 0
    for t in tasks:
        try:
            total_cost += float(t["cost"].replace(",", ""))
        except (ValueError, AttributeError):
            pass

    # Overall RAG
    if delayed > 0 or at_risk >= 2:
        rag = "RED" if delayed > 1 else "YELLOW"
    elif at_risk == 1:
        rag = "YELLOW"
    else:
        rag = "GREEN"

    return {
        "total_tasks": total,
        "complete": complete,
        "on_track": on_track,
        "at_risk": at_risk,
        "delayed": delayed,
        "not_started": not_started,
        "total_budget": total_cost,
        "suggested_rag": rag,
    }


def format_task_for_report(task: dict) -> str:
    """Format a single task as a report bullet line."""
    name = task.get("task_name", "[CONFIRM]")
    pct = task.get("pct_complete", "[CONFIRM]")
    end_date = task.get("end_date", "[CONFIRM]")
    status = task.get("status", "[CONFIRM]")
    cost = task.get("cost", "[CONFIRM]")

    status_icon = {
        "Complete": "✅",
        "On Track": "🟢",
        "At Risk": "⚠️",
        "Delayed": "🔴",
        "Not Started": "🔵",
    }.get(status, "❓")

    return (
        f"• **{name}**: {pct}% complete | Target: {end_date} | "
        f"{status_icon} {status} | Budget: ${cost}"
    )


def get_at_risk_tasks(tasks: list[dict]) -> list[dict]:
    """Return all tasks that are At Risk or Delayed."""
    return [t for t in tasks if t["status"] in ("At Risk", "Delayed")]


def get_upcoming_tasks(tasks: list[dict]) -> list[dict]:
    """Return tasks that are On Track or At Risk (not complete, not started)."""
    return [t for t in tasks if t["status"] in ("On Track", "At Risk")]
