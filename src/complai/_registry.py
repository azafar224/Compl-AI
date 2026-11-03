# ruff: noqa: F401
"""Central task registry importing all compliant Compl-AI evaluation tasks."""

from complai.tasks.aime_2025 import aime_2025
from complai.tasks.arc_challenge import arc_challenge
from complai.tasks.bbq import bbq
from complai.tasks.bigbench_calibration import bigbench_calibration
from complai.tasks.bold import bold
from complai.tasks.boolq_contrast import boolq_contrast
from complai.tasks.cab import cab
from complai.tasks.decoding_trust import decoding_trust
from complai.tasks.fairllm import fairllm
from complai.tasks.forecast_consistency import forecast_consistency
from complai.tasks.gpqa_diamond import gpqa_diamond
from complai.tasks.hle import hle
from complai.tasks.human_deception import human_deception
from complai.tasks.ifbench import ifbench
from complai.tasks.imdb_contrast import imdb_contrast
from complai.tasks.include import include
from complai.tasks.instruction_goal_hijacking import instruction_goal_hijacking
from complai.tasks.livebench_coding import livebench_coding
from complai.tasks.llm_rules import llm_rules
from complai.tasks.mask import mask
from complai.tasks.mmlu_pro import mmlu_pro
from complai.tasks.mmlu_pro_robustness import mmlu_pro_robustness
from complai.tasks.mmmu_pro import mmmu_pro
from complai.tasks.realtoxicityprompts import realtoxicityprompts
from complai.tasks.self_check_consistency import self_check_consistency
from complai.tasks.simpleqa_verified import simpleqa_verified
from complai.tasks.strong_reject import strong_reject
from complai.tasks.swe_bench_verified import swe_bench_verified
from complai.tasks.triviaqa_calibration import triviaqa_calibration
from complai.tasks.truthfulqa import truthfulqa

__all__ = [
    "aime_2025",
    "arc_challenge",
    "bbq",
    "bigbench_calibration",
    "bold",
    "boolq_contrast",
    "cab",
    "decoding_trust",
    "fairllm",
    "forecast_consistency",
    "gpqa_diamond",
    "hle",
    "human_deception",
    "ifbench",
    "imdb_contrast",
    "include",
    "instruction_goal_hijacking",
    "livebench_coding",
    "llm_rules",
    "mask",
    "mmlu_pro",
    "mmlu_pro_robustness",
    "mmmu_pro",
    "realtoxicityprompts",
    "self_check_consistency",
    "simpleqa_verified",
    "strong_reject",
    "swe_bench_verified",
    "triviaqa_calibration",
    "truthfulqa",
]
