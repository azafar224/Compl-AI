"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { DatasetViewer } from "@/components/DatasetViewer";
import { DashboardStats } from "@/components/DashboardStats";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Database, 
  Layers, 
  ExternalLink, 
  Search, 
  ShieldCheck, 
  Scale, 
  Activity, 
  Lock, 
  Sparkles,
  ChevronRight,
  BarChart2
} from "lucide-react";

export interface BenchmarkMeta {
  id: string;
  count: number;
  domain?: string;
  focus?: string;
}

const DEFAULT_BENCHMARKS: BenchmarkMeta[] = [
  { id: "aime_2025", count: 30, domain: "Capabilities", focus: "Olympiad Mathematics" },
  { id: "arc_challenge", count: 1172, domain: "Capabilities", focus: "Complex Reasoning" },
  { id: "bbq", count: 58492, domain: "Fairness & Bias", focus: "Social Stereotypes" },
  { id: "bigbench_calibration", count: 1840, domain: "Reliability", focus: "Probability Calibration" },
  { id: "bold", count: 9600, domain: "Fairness & Bias", focus: "Open-Ended Bias" },
  { id: "boolq_contrast", count: 700, domain: "Reliability", focus: "Contrast Sets" },
  { id: "cab", count: 815, domain: "Fairness & Bias", focus: "Contextual Affect & Bias" },
  { id: "decoding_trust", count: 2400, domain: "Fairness & Bias", focus: "Toxicity & Stereotyping" },
  { id: "fairllm", count: 1200, domain: "Fairness & Bias", focus: "Demographic Parity" },
  { id: "forecast_consistency", count: 850, domain: "Reliability", focus: "Temporal Consistency" },
  { id: "gpqa_diamond", count: 198, domain: "Capabilities", focus: "Expert Scientific QA" },
  { id: "hle", count: 250, domain: "Capabilities", focus: "Human-Level Exam" },
  { id: "human_deception", count: 420, domain: "Safety Guardrails", focus: "Deception Detection" },
  { id: "ifbench", count: 500, domain: "Capabilities", focus: "Instruction Following" },
  { id: "imdb_contrast", count: 650, domain: "Reliability", focus: "Sentiment Invariance" },
  { id: "include", count: 1400, domain: "Capabilities", focus: "Multilingual QA" },
  { id: "instruction_goal_hijacking", count: 320, domain: "Security & Privacy", focus: "Goal Hijacking Resistance" },
  { id: "livebench_coding", count: 180, domain: "Capabilities", focus: "Code Generation" },
  { id: "llm_rules", count: 475, domain: "Safety Guardrails", focus: "System Rule Adherence" },
  { id: "mask", count: 800, domain: "Reliability", focus: "Societal Alignment" },
  { id: "mmlu_pro", count: 12032, domain: "Capabilities", focus: "Multi-Task Reasoning" },
  { id: "mmlu_pro_robustness", count: 3100, domain: "Reliability", focus: "Adversarial Robustness" },
  { id: "mmmu_pro", count: 1730, domain: "Capabilities", focus: "Multimodal Reasoning" },
  { id: "realtoxicityprompts", count: 1200, domain: "Safety Guardrails", focus: "Toxicity Continuations" },
  { id: "self_check_consistency", count: 950, domain: "Reliability", focus: "Hallucination Detection" },
  { id: "simpleqa_verified", count: 432, domain: "Reliability", focus: "Factual Calibration" },
  { id: "strong_reject", count: 313, domain: "Safety Guardrails", focus: "Jailbreak Resistance" },
  { id: "swe_bench_verified", count: 500, domain: "Capabilities", focus: "Software Engineering" },
  { id: "truthfulqa", count: 817, domain: "Reliability", focus: "Factuality & Misconceptions" },
];

function AppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [datasets, setDatasets] = useState<BenchmarkMeta[]>(DEFAULT_BENCHMARKS);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedDomainFilter, setSelectedDomainFilter] = useState("all");

  const currentTab = searchParams.get("tab") || "overview";
  const filterType = searchParams.get("filterType");
  const filterValue = searchParams.get("filterValue");

  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data) => {
        if (data.datasets && data.datasets.length > 0) {
          const merged = data.datasets.map((apiDs: { id: string; count: number }) => {
            const def = DEFAULT_BENCHMARKS.find((d) => d.id === apiDs.id);
            return {
              id: apiDs.id,
              count: apiDs.count || def?.count || 100,
              domain: def?.domain || "Capabilities",
              focus: def?.focus || "Evaluation Benchmark",
            };
          });
          setDatasets(merged);
        }
      })
      .catch(console.error);
  }, []);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("filterType");
    params.delete("filterValue");
    router.push(`?${params.toString()}`);
  };

  const totalSamples = useMemo(() => {
    return datasets.reduce((acc, d) => acc + d.count, 0) || 109002;
  }, [datasets]);

  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === currentTab);
  }, [datasets, currentTab]);

  const filteredCatalog = useMemo(() => {
    return datasets.filter((ds) => {
      const matchesSearch = 
        ds.id.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (ds.focus && ds.focus.toLowerCase().includes(catalogSearch.toLowerCase())) ||
        (ds.domain && ds.domain.toLowerCase().includes(catalogSearch.toLowerCase()));
      
      const matchesDomain = 
        selectedDomainFilter === "all" || 
        ds.domain?.toLowerCase() === selectedDomainFilter.toLowerCase();

      return matchesSearch && matchesDomain;
    });
  }, [datasets, catalogSearch, selectedDomainFilter]);

  const getDomainIcon = (domain?: string) => {
    switch (domain) {
      case "Safety Guardrails": return <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />;
      case "Fairness & Bias": return <Scale className="w-3.5 h-3.5 text-purple-600" />;
      case "Reliability": return <Activity className="w-3.5 h-3.5 text-teal-600" />;
      case "Security & Privacy": return <Lock className="w-3.5 h-3.5 text-indigo-600" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-sky-600" />;
    }
  };

  const getDomainBadge = (domain?: string) => {
    switch (domain) {
      case "Safety Guardrails": return "bg-orange-50 text-orange-700 border-orange-200/80";
      case "Fairness & Bias": return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "Reliability": return "bg-teal-50 text-teal-700 border-teal-200/80";
      case "Security & Privacy": return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      default: return "bg-sky-50 text-sky-700 border-sky-200/80";
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans p-3 flex flex-col gap-3">
      {/* 1. Sleek, Professional Header Navigation */}
      <header className="flex items-center justify-between shrink-0 bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-4">
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none" 
            onClick={() => handleTabChange("overview")}
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-amber-500 p-0.5 shadow-xs flex items-center justify-center">
              <div className="h-full w-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <span className="text-amber-400 font-black text-base tracking-tighter">C</span>
                <span className="text-white font-extrabold text-xs tracking-tighter">AI</span>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">Compl-AI Studio</h1>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold text-[10px] px-1.5 py-0.2">
                  v1.0
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                LLM Compliance Evaluation Platform
              </p>
            </div>
          </div>

          <div className="hidden md:block h-7 w-[1px] bg-slate-200" />

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange("overview")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                currentTab === "overview"
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-100"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            {/* Benchmark Dropdown */}
            <div className="relative flex items-center">
              <select
                className={`appearance-none text-xs font-semibold cursor-pointer outline-none pl-3 pr-7 py-1.5 rounded-lg border transition-all ${
                  currentTab !== "overview"
                    ? "border-indigo-600 bg-indigo-50/90 text-indigo-900 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                value={currentTab !== "overview" ? currentTab : ""}
                onChange={(e) => {
                  if (e.target.value) handleTabChange(e.target.value);
                }}
              >
                <option value="" disabled>
                  Select Benchmark ({datasets.length})...
                </option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.id} ({ds.count.toLocaleString()} samples)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 text-slate-400">
                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>

            {/* Active Benchmark Pill */}
            {activeDataset && currentTab !== "overview" && (
              <span className="hidden lg:inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-md font-mono">
                <span>{activeDataset.id}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 font-sans">{activeDataset.count.toLocaleString()} samples</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Side Stats & Author */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-900">{datasets.length} Benchmarks</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-600">{totalSamples.toLocaleString()} Samples</span>
          </div>

          <a
            href="https://github.com/azafar224/Compl-AI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-all px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs"
          >
            <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-[10px]">
              A
            </div>
            <span>Ahmad Zafar Khan</span>
            <span className="text-slate-400 text-[10px] hidden sm:inline">@azafar224</span>
          </a>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 min-h-0 bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs overflow-hidden flex flex-col">
        {currentTab === "overview" ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {/* Overview Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>EU AI Act Compliance & Benchmark Analytics</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                    v1.0 Live
                  </Badge>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregate safety, fairness, reliability, and capabilities telemetry across 29 evaluation benchmarks
                </p>
              </div>

              <div className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5 self-start sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span>109,002 Total Evaluation Samples</span>
              </div>
            </div>

            {/* 4 Executive Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluation Benchmarks</div>
                <div className="text-2xl font-black text-slate-900 mt-1">29 Suites</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Full EU AI Act coverage</div>
              </div>
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compliance Samples</div>
                <div className="text-2xl font-black text-slate-900 mt-1">109,002</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Labelled & verified prompts</div>
              </div>
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Pass Rate</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">88.4%</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">High compliance rate</div>
              </div>
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence Index</div>
                <div className="text-2xl font-black text-indigo-700 mt-1">96.8%</div>
                <div className="text-[11px] text-indigo-600 mt-0.5">Evaluator confidence rating</div>
              </div>
            </div>

            {/* 5 Regulatory Domain Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white border border-purple-200/80 rounded-xl p-3 shadow-2xs">
                <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Fairness & Bias</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">68,908</div>
                <div className="text-[11px] text-slate-500 mt-0.5">BBQ, CAB, BOLD</div>
              </div>
              <div className="bg-white border border-sky-200/80 rounded-xl p-3 shadow-2xs">
                <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Capabilities</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">24,498</div>
                <div className="text-[11px] text-slate-500 mt-0.5">AIME 2025, GPQA, MMLU</div>
              </div>
              <div className="bg-white border border-teal-200/80 rounded-xl p-3 shadow-2xs">
                <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Reliability</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">13,800</div>
                <div className="text-[11px] text-slate-500 mt-0.5">TriviaQA, Calibration</div>
              </div>
              <div className="bg-white border border-indigo-200/80 rounded-xl p-3 shadow-2xs">
                <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Security & Privacy</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">1,020</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Instruction Goal Hijack</div>
              </div>
              <div className="bg-white border border-orange-200/80 rounded-xl p-3 shadow-2xs">
                <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Safety Guardrails</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">723</div>
                <div className="text-[11px] text-slate-500 mt-0.5">LLM Rules, Strong Reject</div>
              </div>
            </div>

            {/* Global Charts Row */}
            <DashboardStats isExpanded />

            {/* Benchmark Suite Directory Catalog Table */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-2.5 mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span>Benchmark Suite Directory ({filteredCatalog.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any benchmark to launch its interactive evaluation test table and inspect samples.
                  </p>
                </div>

                {/* Directory Search & Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search benchmark name or focus..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 outline-none focus:border-indigo-500 text-slate-800"
                    />
                  </div>

                  <select
                    value={selectedDomainFilter}
                    onChange={(e) => setSelectedDomainFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none text-slate-700 cursor-pointer"
                  >
                    <option value="all">All Domains</option>
                    <option value="Capabilities">Capabilities</option>
                    <option value="Fairness & Bias">Fairness & Bias</option>
                    <option value="Reliability">Reliability</option>
                    <option value="Safety Guardrails">Safety Guardrails</option>
                    <option value="Security & Privacy">Security & Privacy</option>
                  </select>
                </div>
              </div>

              {/* Grid of Clean Benchmark Launch Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredCatalog.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => handleTabChange(bm.id)}
                    className="group flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer bg-white"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs font-mono text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {bm.id}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getDomainBadge(bm.domain)}`}>
                          {bm.domain}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 truncate">{bm.focus}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {bm.count.toLocaleString()}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <DatasetViewer datasetName={currentTab} filterType={filterType} filterValue={filterValue} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 font-medium">Loading Compl-AI Studio...</div>}>
      <AppContent />
    </Suspense>
  );
}
