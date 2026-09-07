"""AIME 2025 mathematics evaluation benchmark task."""

from inspect_ai import Epochs, Task, task, task_with
from inspect_evals.aime2025.aime2025 import aime2025 as inspect_aime2025


@task(technical_requirement="Capabilities, Performance, and Limitations")
def aime_2025(num_epochs: int = 4) -> Task:
    """Evaluate model performance on the AIME 2025 competition math benchmark."""
    return task_with(inspect_aime2025(), epochs=Epochs(num_epochs, "mean"))
