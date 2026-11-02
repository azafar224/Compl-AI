"""CLI command to list available Compl-AI benchmark tasks."""

from collections import defaultdict

from inspect_ai import TaskInfo
from rich import print

from complai._cli.utils import get_complai_tasks


def list_command() -> None:
    """List all available tasks grouped by technical requirement."""
    # Get all tasks
    tasks = get_complai_tasks()
    if not tasks:
        print("No tasks available.")
        return

    # Group tasks by technical requirement
    tasks_by_requirement: dict[str, list[TaskInfo]] = defaultdict(list)
    for task in tasks:
        requirement = task.attribs.get("technical_requirement", "General")
        tasks_by_requirement[requirement].append(task)

    # Print tasks grouped by technical requirement in sorted order
    for requirement, grouped_tasks in sorted(tasks_by_requirement.items()):
        print(f"[bold]{requirement}[/bold]")
        print("  " + ", ".join(task.name for task in grouped_tasks))
