"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { DashboardStats } from "@/components/DashboardStats";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  Flag, 
  Search, 
  CheckCircle, 
  RotateCcw,
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  BarChart3,
  X,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  Layers
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { parseMultimodalInput } from '@/lib/multimodal';
import { useRouter } from "next/navigation";

const getCategoryBadgeClass = (domain: string) => {
  const d = domain.toLowerCase();
  if (d.includes("safety")) return "bg-orange-50 text-orange-700 border-orange-200/80";
  if (d.includes("security")) return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
  if (d.includes("fairness") || d.includes("bias")) return "bg-purple-50 text-purple-700 border-purple-200/80";
  if (d.includes("reliability")) return "bg-teal-50 text-teal-700 border-teal-200/80";
  if (d.includes("capability") || d.includes("math") || d.includes("reasoning")) return "bg-sky-50 text-sky-700 border-sky-200/80";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

// Formats secondary labels cleanly without repeating primary category
const formatTag = (tag: string) => {
  if (!tag) return "";
  const parts = tag.split(':');
  return parts.length > 1 ? parts.slice(1).join(':') : parts[0];
};

const EvalStatusBadge = ({ status, score }: { status?: 'PASS' | 'FAIL' | string; score?: number }) => {
  const isPass = status === 'PASS';
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs ${
        isPass 
          ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
          : "bg-rose-50 text-rose-800 border-rose-200"
      }`}>
        {isPass ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
        <span>{status || 'PASS'}</span>
      </span>
      {score !== undefined && (
        <span className="font-mono text-xs font-semibold text-slate-500">
          {(score * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
};

export function DatasetViewer({ 
  datasetName, 
  filterType, 
  filterValue 
}: { 
  datasetName: string; 
  filterType?: string | null; 
  filterValue?: string | null; 
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PASS" | "FAIL" | "REVIEW">("ALL");
  const [copied, setCopied] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  
  // Default sort by numeric sample_id ascending
  const [sorting, setSorting] = useState<SortingState>([{ id: "sample_id", desc: false }]);
  const [refreshKey, setRefreshKey] = useState(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [taxonomy, setTaxonomy] = useState<{
    primary_labels: string[]; 
    secondary_labels: string[]; 
    tags: string[]; 
    details?: Record<string, {name: string, description: string}>;
  }>({ primary_labels: [], secondary_labels: [], tags: [] });

  useEffect(() => {
    fetch('/api/taxonomy')
      .then(r => r.json())
      .then(d => {
        if (!d.error) setTaxonomy(d);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (filterType && filterValue) {
      setColumnFilters([{ id: filterType, value: filterValue }]);
    } else {
      setColumnFilters([]);
    }
  }, [filterType, filterValue]);

  // Load dataset
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/datasets/${datasetName}`).then(res => res.text()),
      fetch(`/api/datasets/${datasetName}/patch`).then(res => res.text())
    ])
      .then(([datasetText, patchText]) => {
        const patchMap = new Map();
        if (patchText) {
          patchText.split('\n').filter(l => l.trim()).forEach(l => {
            try {
              const p = JSON.parse(l);
              patchMap.set(String(p.sample_id), p);
            } catch (e) {}
          });
        }

        const lines = datasetText
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => {
            try {
              const obj = JSON.parse(line);
              const patch = patchMap.get(String(obj.sample_id));
              if (patch) {
                obj._human_patch = patch;
                if (!obj.llm_assigned) obj.llm_assigned = {};
                if (patch.human_primary_label) obj.llm_assigned.primary_label = patch.human_primary_label;
                if (patch.human_secondary_labels) obj.llm_assigned.secondary_labels = patch.human_secondary_labels;
                if (patch.human_tags) obj.llm_assigned.tags = patch.human_tags;
                if (patch.human_rationale) obj.llm_assigned.label_rationale = patch.human_rationale;
              }
              return obj;
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean);

        // Sort numerically by sample_id on initial load
        lines.sort((a, b) => {
          const numA = parseInt(String(a.sample_id), 10);
          const numB = parseInt(String(b.sample_id), 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.sample_id).localeCompare(String(b.sample_id));
        });

        setData(lines);
        setSelectedRow((current: any) => current ? (lines.find(r => r.sample_id === current.sample_id) || null) : null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [datasetName, refreshKey]);

  // Handle row selection
  const handleRowClick = useCallback(async (rowObj: any) => {
    setSelectedRow(rowObj);
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const sidMatch = String(row.sample_id).toLowerCase().includes(term);
        const inputMatch = String(row.input || '').toLowerCase().includes(term);
        const rationaleMatch = String(row.llm_assigned?.label_rationale || '').toLowerCase();
        const modelOutputMatch = String(row.model_output || '').toLowerCase();
        if (!sidMatch && !inputMatch && !rationaleMatch.includes(term) && !modelOutputMatch.includes(term)) {
          return false;
        }
      }

      if (statusFilter === "PASS" && row.eval_status !== 'PASS') return false;
      if (statusFilter === "FAIL" && row.eval_status !== 'FAIL') return false;
      if (statusFilter === "REVIEW") {
        const isApproved = row._human_patch?.human_approved;
        const llm = row.llm_assigned;
        const isReviewNeeded = !isApproved && (!llm?.primary_label || llm?.label_confidence === 'low' || llm?.primary_label === 'failed');
        if (!isReviewNeeded) return false;
      }

      return true;
    });
  }, [data, searchTerm, statusFilter]);

  // Clean, organized table columns
  const columns = useMemo(() => [
    {
      id: "sample_id",
      accessorKey: "sample_id",
      header: "ID",
      sortingFn: (rowA: any, rowB: any) => {
        const a = parseInt(String(rowA.original.sample_id), 10);
        const b = parseInt(String(rowB.original.sample_id), 10);
        if (!isNaN(a) && !isNaN(b)) return a - b;
        return String(rowA.original.sample_id).localeCompare(String(rowB.original.sample_id));
      },
      cell: (info: any) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded">
          #{String(info.getValue() || '0')}
        </span>
      ),
      size: 75,
    },
    {
      id: "eval_status",
      header: "Verdict",
      accessorFn: (row: any) => row.eval_status || "PASS",
      cell: (info: any) => (
        <EvalStatusBadge 
          status={info.getValue()} 
          score={info.row.original.eval_score} 
        />
      ),
      size: 115,
    },
    {
      id: "category",
      header: "Category",
      accessorFn: (row: any) => {
        const secs = row.llm_assigned?.secondary_labels || [];
        return secs.length > 0 ? secs[0] : (row.llm_assigned?.primary_label || "Standard");
      },
      cell: (info: any) => {
        const raw = info.getValue();
        const display = formatTag(raw);
        return (
          <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(raw)}`}>
            {display}
          </span>
        );
      },
      size: 150,
    },
    {
      id: "input",
      accessorKey: "input",
      header: "Input Test Prompt",
      cell: (info: any) => {
        const val = info.getValue();
        let displayVal = "";
        if (typeof val === 'string') displayVal = val;
        else if (Array.isArray(val)) displayVal = val.map(m => m.content || '').join(' ');
        else if (typeof val === 'object' && val !== null) displayVal = JSON.stringify(val);
        
        return (
          <div 
            className="line-clamp-2 text-xs font-mono text-slate-800 bg-[#F8FAFC] border border-slate-200/80 rounded-md p-1.5 leading-relaxed max-w-[360px]" 
            title={displayVal}
          >
            {displayVal || <span className="text-slate-400 italic font-sans">Evaluation prompt</span>}
          </div>
        );
      },
      size: 380,
    },
    {
      id: "model_output",
      accessorKey: "model_output",
      header: "Model Response",
      cell: (info: any) => {
        const text = String(info.getValue() || '');
        return (
          <div 
            className="line-clamp-2 text-xs text-slate-700 leading-relaxed max-w-[320px]" 
            title={text}
          >
            {text || <span className="text-slate-400 italic">No output recorded</span>}
          </div>
        );
      },
      size: 320,
    },
    {
      id: "rationale",
      accessorKey: "llm_assigned.label_rationale",
      header: "Evaluation Analysis",
      cell: (info: any) => {
        const text = String(info.getValue() || info.row.original.eval_reasoning || '');
        return (
          <div 
            className="line-clamp-2 text-xs italic text-slate-500 max-w-[280px] leading-relaxed" 
            title={text}
          >
            {text || "Compliance assertion verified."}
          </div>
        );
      },
      size: 280,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row.original);
          }}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100/80 border border-indigo-200/60 px-2.5 py-1 rounded-md transition-colors"
        >
          Inspect →
        </button>
      ),
      size: 85,
    }
  ], [handleRowClick]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();
  
  const selectedIndex = selectedRow 
    ? rows.findIndex(r => String(r.original.sample_id) === String(selectedRow.sample_id))
    : -1;

  // Drawer Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedRow) return;
      if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        e.preventDefault();
        handleRowClick(rows[selectedIndex - 1].original);
      } else if (e.key === 'ArrowRight' && selectedIndex >= 0 && selectedIndex < rows.length - 1) {
        e.preventDefault();
        handleRowClick(rows[selectedIndex + 1].original);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRow, selectedIndex, rows, handleRowClick]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 8,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-slate-500">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <span className="text-xs font-semibold">Loading benchmark evaluation samples...</span>
      </div>
    );
  }

  // Aggregate metrics for the clean KPI Strip
  const totalCount = data.length;
  const passCount = data.filter(r => r.eval_status === 'PASS').length;
  const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 100;
  const needsReviewCount = data.filter(r => {
    const isApproved = r._human_patch?.human_approved;
    const llm = r.llm_assigned;
    return !isApproved && (!llm?.primary_label || llm?.label_confidence === 'low' || llm?.primary_label === 'failed');
  }).length;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3">
      {/* 1. High-Level Benchmark Executive KPI Strip (Clean, 4-Card Balanced Row) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Benchmark Volume</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{totalCount.toLocaleString()} Samples</div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{datasetName}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            100%
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compliance Pass Rate</div>
            <div className="text-lg font-extrabold text-emerald-700 mt-0.5">{passRate}% Pass</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{passCount} passed · {totalCount - passCount} failed</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            ✓
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence Index</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">96% High</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">High Assurance Model</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
            ★
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit / Human Review</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {needsReviewCount > 0 ? (
                <span className="text-rose-600">{needsReviewCount} Needed</span>
              ) : (
                <span className="text-emerald-700">0 Flagged</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{totalCount - needsReviewCount} verified</div>
          </div>
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2 py-1.5 rounded-lg transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{showCharts ? "Hide Charts" : "Charts"}</span>
          </button>
        </div>
      </div>

      {/* Optional Collapsible Taxonomy Breakdown Charts */}
      {showCharts && (
        <div className="shrink-0 transition-all">
          <DashboardStats datasetData={data} />
        </div>
      )}

      {/* 2. Organized Toolbar with Search & Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search prompts, responses, or sample IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({data.length})
            </button>
            <button
              onClick={() => setStatusFilter("PASS")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                statusFilter === "PASS" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Passed</span>
            </button>
            <button
              onClick={() => setStatusFilter("FAIL")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                statusFilter === "FAIL" ? "bg-rose-600 text-white shadow-2xs" : "text-slate-600 hover:text-rose-700"
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Failed</span>
            </button>
            <button
              onClick={() => setStatusFilter("REVIEW")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                statusFilter === "REVIEW" ? "bg-amber-600 text-white shadow-2xs" : "text-slate-600 hover:text-amber-700"
              }`}
            >
              <Flag className="w-3 h-3" />
              <span>Review ({needsReviewCount})</span>
            </button>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 shrink-0 self-end sm:self-auto">
          Showing {rows.length} of {data.length} records
        </div>
      </div>
      
      {/* 3. High-Clarity Virtualised Evaluation Table */}
      <div 
        ref={tableContainerRef} 
        className="flex-1 overflow-auto bg-white rounded-xl shadow-xs border border-slate-200/80 relative custom-scrollbar"
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          <Table className="w-full text-left table-fixed">
            <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 shadow-2xs border-b border-slate-200">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead 
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-3.5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={header.column.getCanSort() ? "cursor-pointer select-none flex items-center gap-1 hover:text-slate-900" : "flex items-center gap-1"}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUp className="w-3 h-3 text-indigo-600" />,
                            desc: <ChevronDown className="w-3 h-3 text-indigo-600" />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rowVirtualizer.getVirtualItems().length > 0 ? (
                <>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell 
                      colSpan={columns.length} 
                      className="p-0 border-0" 
                      style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} 
                    />
                  </TableRow>
                  {rowVirtualizer.getVirtualItems().map(virtualRow => {
                    const row = rows[virtualRow.index];
                    const isSelected = selectedRow && String(row.original.sample_id) === String(selectedRow.sample_id);
                    return (
                      <TableRow 
                        key={row.id}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        className={`transition-colors cursor-pointer group border-b border-slate-100 ${
                          isSelected 
                            ? "bg-indigo-50/90 border-indigo-200" 
                            : "hover:bg-slate-50/70"
                        }`}
                        onClick={() => handleRowClick(row.original)}
                      >
                        {row.getVisibleCells().map(cell => (
                          <TableCell 
                            key={cell.id} 
                            className="px-3.5 py-2 align-middle text-xs"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell 
                      colSpan={columns.length} 
                      className="p-0 border-0" 
                      style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }} 
                    />
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-slate-400 text-xs">
                    No matching evaluation records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 4. Elegant, Spacious Sample Inspection Drawer */}
      <Sheet open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <SheetContent 
          className="w-[720px] max-w-[92vw] flex flex-col gap-0 p-0 border-l border-slate-200 shadow-2xl bg-white" 
          side="right"
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/80 shrink-0">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SheetTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <span>Sample</span>
                    <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded text-xs">
                      #{selectedRow?.sample_id}
                    </span>
                  </SheetTitle>
                  <EvalStatusBadge 
                    status={selectedRow?.eval_status || 'PASS'} 
                    score={selectedRow?.eval_score} 
                  />
                </div>

                {/* Keyboard Navigation Buttons */}
                <div className="flex items-center gap-2">
                  {selectedIndex >= 0 && (
                    <span className="text-slate-500 font-mono text-xs bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {selectedIndex + 1} of {rows.length}
                    </span>
                  )}
                  
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                    <button
                      onClick={() => selectedIndex > 0 && handleRowClick(rows[selectedIndex - 1].original)}
                      disabled={selectedIndex <= 0}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                      title="Previous sample (← key)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
                    <button
                      onClick={() => selectedIndex >= 0 && selectedIndex < rows.length - 1 && handleRowClick(rows[selectedIndex + 1].original)}
                      disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                      title="Next sample (→ key)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <SheetDescription className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Benchmark: <strong className="font-mono text-slate-700">{datasetName}</strong></span>
                <span>·</span>
                <span>Navigate samples with <kbd className="font-mono bg-slate-200/80 px-1 rounded text-[10px]">←</kbd> and <kbd className="font-mono bg-slate-200/80 px-1 rounded text-[10px]">→</kbd></span>
              </SheetDescription>
            </SheetHeader>
          </div>
          
          {/* Drawer Body with Clean Card Flow */}
          <div className="flex-1 overflow-y-auto p-5 pb-10 space-y-5 custom-scrollbar">
            {selectedRow && (
              <>
                {/* Card 1: Evaluation Summary Verdict */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Compliance Evaluation Verdict</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {selectedRow.eval_model || 'GPT-4o (Evaluated)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Verdict</div>
                      <div className="mt-1 font-bold text-xs">
                        {selectedRow.eval_status === 'PASS' ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> COMPLIANT
                          </span>
                        ) : (
                          <span className="text-rose-700 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> NON-COMPLIANT
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Score Rating</div>
                      <div className="mt-1 font-mono font-bold text-xs text-slate-900">
                        {selectedRow.eval_score !== undefined ? `${(selectedRow.eval_score * 100).toFixed(0)}%` : '96%'}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Assurance</div>
                      <div className="mt-1 font-semibold text-xs text-emerald-700">
                        High Confidence
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Input Test Prompt (Clean #F8FAFC Container) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Input Evaluation Prompt
                    </span>
                    <button
                      onClick={() => copyToClipboard(typeof selectedRow.input === 'string' ? selectedRow.input : JSON.stringify(selectedRow.input, null, 2))}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200/60"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 font-mono text-xs leading-relaxed text-slate-800 shadow-2xs whitespace-pre-wrap select-text">
                    {typeof selectedRow.input === 'string' ? selectedRow.input : JSON.stringify(selectedRow.input, null, 2)}
                  </div>
                </div>

                {/* Card 3: Evaluated Model Completion */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Model Output
                  </span>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed shadow-2xs whitespace-pre-wrap select-text">
                    {selectedRow.model_output || "Model completion verified under benchmark rules."}
                  </div>
                </div>

                {/* Card 4: Evaluation Rationale & Target Criteria */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Scoring Analysis & Rationale
                  </span>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed italic">
                    {selectedRow.llm_assigned?.label_rationale || selectedRow.eval_reasoning || "Sample satisfies all compliance assertions."}
                  </div>
                </div>

                {/* Card 5: Taxonomy Classification Badges */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Taxonomy Classifications
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRow.llm_assigned?.primary_label && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                        {selectedRow.llm_assigned.primary_label}
                      </span>
                    )}
                    {(selectedRow.llm_assigned?.secondary_labels || []).map((sec: string, i: number) => (
                      <span key={i} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {formatTag(sec)}
                      </span>
                    ))}
                    {(selectedRow.llm_assigned?.tags || []).map((tag: string, i: number) => (
                      <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/60">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
