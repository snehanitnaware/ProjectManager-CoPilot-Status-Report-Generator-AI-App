"""
Skill: Schedule Delay Helper
Purpose: Convert planned vs. actual/forecast dates into human-readable delay phrases.
Triggered when both a planned date and an actual/forecast date are known.
"""

from datetime import datetime, date
from typing import Optional, Tuple


def parse_date(date_str: str) -> Optional[date]:
    """Parse a date string in common formats."""
    if not date_str or date_str.strip() in ("[CONFIRM]", "N/A", "", "TBD"):
        return None
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d %b %Y",
        "%d-%b-%Y",
        "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None


def calculate_delay(planned_date_str: str, actual_date_str: str) -> dict:
    """
    Calculate schedule delay between planned and actual/forecast completion dates.

    Returns:
        {
          "days_delta": int (positive = behind, negative = ahead, 0 = on time),
          "phrase": str (human-readable),
          "status": str ("Behind Schedule" | "Ahead of Schedule" | "On Schedule" | "CONFIRM"),
          "valid": bool
        }
    """
    planned = parse_date(planned_date_str)
    actual = parse_date(actual_date_str)

    if planned is None or actual is None:
        return {
            "days_delta": None,
            "phrase": "[CONFIRM – one or both dates are missing or invalid]",
            "status": "CONFIRM",
            "valid": False,
        }

    delta = (actual - planned).days

    if delta > 0:
        phrase = f"{delta} day{'s' if delta != 1 else ''} behind schedule"
        status = "Behind Schedule"
    elif delta < 0:
        phrase = f"{abs(delta)} day{'s' if abs(delta) != 1 else ''} ahead of schedule"
        status = "Ahead of Schedule"
    else:
        phrase = "on schedule"
        status = "On Schedule"

    return {
        "days_delta": delta,
        "phrase": phrase,
        "status": status,
        "valid": True,
    }


def assess_schedule_impact(delay_result: dict, task_name: str = "") -> str:
    """
    Generate a human-readable impact statement for a delayed/early task.
    """
    if not delay_result.get("valid"):
        return f"Schedule impact for {task_name or 'this task'}: [CONFIRM – dates unavailable]"

    delta = delay_result["days_delta"]
    phrase = delay_result["phrase"]
    name = task_name or "This task"

    if delta == 0:
        return f"{name} is currently **on schedule**."
    elif delta > 0:
        if delta <= 5:
            severity = "minor impact"
        elif delta <= 14:
            severity = "moderate impact — dependent tasks may be affected"
        else:
            severity = "significant impact — escalation and mitigation plan required"
        return (
            f"{name} is **{phrase}** ({severity}). "
            f"Downstream activities dependent on this task should be reviewed."
        )
    else:
        return f"{name} is **{phrase}**, creating buffer for downstream activities."


def format_delay_summary(tasks: list[dict]) -> list[str]:
    """
    For a list of task dicts (from schedule CSV), produce delay summary lines
    for tasks that are At Risk or Delayed.
    """
    lines = []
    for task in tasks:
        if task.get("status") not in ("At Risk", "Delayed"):
            continue
        name = task.get("task_name", "[CONFIRM]")
        planned = task.get("end_date", "")
        # For At Risk/Delayed tasks, we don't have a revised date unless provided
        # We surface CONFIRM for the actual completion date
        result = {
            "days_delta": None,
            "phrase": "[CONFIRM – revised completion date not provided]",
            "status": "CONFIRM",
            "valid": False,
        }
        lines.append(f"• {name}: {result['phrase']}")
    return lines
