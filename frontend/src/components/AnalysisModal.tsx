"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Eye,
  Info,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X,
} from "lucide-react";
import type { Node } from "@xyflow/react";
import type {
  AnalysisResult,
  Finding,
  ArchitectureNodeData,
} from "./types";

export interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AnalysisResult | null;
  projectName?: string;
  projectDescription?: string;
  projectConcerns?: string;
  peakRps?: string;
  nodes: Node<ArchitectureNodeData>[];
  onGenerateVariants?: () => void;
  isGeneratingVariants?: boolean;
  onSelectNode?: (nodeId: string) => void;
  onHighlightFinding?: (finding: Finding) => void;
  className?: string;
}

type SeverityFilter = "ALL" | "CRITICAL" | "WARNING" | "INFO";

export function AnalysisModal({
  isOpen,
  onClose,
  analysisResult,
  projectName = "Untitled Architecture",
  projectDescription,
  projectConcerns,
  peakRps,
  nodes,
  onGenerateVariants,
  isGeneratingVariants = false,
  onSelectNode,
  onHighlightFinding,
  className = "",
}: AnalysisModalProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const getNodeLabel = (id: string): string => {
    const node = nodes.find((n) => n.id === id);
    return node?.data?.label || id;
  };

  // Map of SPOF findings for quick lookup by node ID
  const spofFindingsMap = useMemo(() => {
    const map = new Map<string, Finding>();
    if (!analysisResult) return map;

    analysisResult.findings.forEach((f) => {
      const isSpofFinding =
        f.ruleId === "SPOF_CRITICAL_PATH" ||
        f.isSpof === true ||
        f.title.toLowerCase().includes("single point of failure");

      if (isSpofFinding && f.affectedNodes) {
        f.affectedNodes.forEach((id) => {
          map.set(id, f);
        });
      }
    });

    return map;
  }, [analysisResult]);

  // Counts by severity
  const severityCounts = useMemo(() => {
    if (!analysisResult) return { total: 0, critical: 0, warning: 0, info: 0 };

    let critical = 0;
    let warning = 0;
    let info = 0;

    analysisResult.findings.forEach((f) => {
      const sev = (f.severity || "").toUpperCase();
      if (sev === "CRITICAL") critical++;
      else if (sev === "WARNING") warning++;
      else info++;
    });

    return {
      total: analysisResult.findings.length,
      critical,
      warning,
      info,
    };
  }, [analysisResult]);

  // Filtered findings based on active tab
  const filteredFindings = useMemo(() => {
    if (!analysisResult) return [];
    if (severityFilter === "ALL") return analysisResult.findings;

    return analysisResult.findings.filter((f) => {
      const sev = (f.severity || "").toUpperCase();
      return sev === severityFilter;
    });
  }, [analysisResult, severityFilter]);

  if (!isOpen || !analysisResult) {
    return null;
  }

  const handleNodeClick = (nodeId: string) => {
    if (onSelectNode) {
      onSelectNode(nodeId);
      onClose();
    }
  };

  const handleFindingFocus = (finding: Finding) => {
    if (onHighlightFinding) {
      onHighlightFinding(finding);
      onClose();
    } else if (onSelectNode && finding.affectedNodes.length > 0) {
      onSelectNode(finding.affectedNodes[0]);
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-modal-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3
                id="analysis-modal-title"
                className="text-base font-bold text-slate-800"
              >
                Architecture Evaluation Report
              </h3>
              <p className="text-xs text-slate-500">
                {projectName} · Generated{" "}
                {new Date(analysisResult.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            onClick={onClose}
            aria-label="Close report"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Gatekeeper Completeness Banner */}
          {analysisResult.gatekeeper &&
            (analysisResult.gatekeeper.canGenerateVariants ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-emerald-900 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-emerald-900">
                        Structural Completeness Verified
                      </h4>
                      <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        Gatekeeper Passed
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-emerald-700">
                      {analysisResult.gatekeeper.mode === "BLANK_SLATE"
                        ? "Blank canvas — ready to synthesize starting architecture from user goals."
                        : "Architecture connectivity is sound from entry to persistence. Eligible for AI variant generation."}
                    </p>
                  </div>
                </div>
                {onGenerateVariants && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGenerateVariants();
                    }}
                    disabled={isGeneratingVariants}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                  >
                    {isGeneratingVariants ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Generate 4 Variants</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 text-rose-950 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-rose-900">
                        Basic Structural Flaws Detected — AI Generation Blocked
                      </h4>
                      <span className="rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                        Locked
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-rose-700">
                      {analysisResult.gatekeeper.reason}
                    </p>
                  </div>
                </div>

                {analysisResult.gatekeeper.blockingFlaws.length > 0 && (
                  <div className="mt-3 border-t border-rose-200/80 pt-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                      Blocking Flaws That Must Be Resolved (
                      {analysisResult.gatekeeper.blockingFlaws.length}):
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {analysisResult.gatekeeper.blockingFlaws.map(
                        (flaw, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs text-rose-900"
                          >
                            <span className="font-mono text-rose-600">•</span>
                            <div>
                              <strong className="font-semibold text-rose-900">
                                {flaw.title}:{" "}
                              </strong>
                              <span className="text-rose-800">
                                {flaw.description}
                              </span>
                              <p className="mt-0.5 text-[11px] font-medium text-rose-600">
                                Action: {flaw.remediation || flaw.recommendation}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* Score Ribbon */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-center">
              <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">
                Overall Score
              </span>
              <div className="mt-1 text-2xl font-black text-indigo-900">
                {analysisResult.scoring.overall}
                <span className="text-xs font-semibold text-indigo-400">
                  /10
                </span>
              </div>
              {analysisResult.scoring.partial ? (
                <span className="mt-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  Structural Audit
                </span>
              ) : (
                <span className="mt-1 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  <CheckCircle2 size={11} />
                  {peakRps
                    ? `${Number(peakRps).toLocaleString()} RPS Sized`
                    : "Traffic-Sized"}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-center">
              <span className="text-[11px] font-semibold text-slate-500">
                Security
              </span>
              <div className="mt-1 text-xl font-bold text-slate-800">
                {analysisResult.scoring.dimensions.security}/10
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-center">
              <span className="text-[11px] font-semibold text-slate-500">
                Reliability
              </span>
              <div className="mt-1 text-xl font-bold text-slate-800">
                {analysisResult.scoring.dimensions.reliability}/10
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-center">
              <span className="text-[11px] font-semibold text-slate-500">
                Scalability
              </span>
              <div className="mt-1 text-xl font-bold text-slate-800">
                {analysisResult.scoring.dimensions.scalability}/10
              </div>
            </div>
          </div>

          {/* User Goals & Focus Scope */}
          {(analysisResult.userIntent?.description ||
            analysisResult.userIntent?.concerns ||
            projectDescription ||
            projectConcerns) && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-indigo-700 uppercase">
                <Target size={14} />
                <span>Your Architecture Goals &amp; Focus Scope</span>
              </div>
              {(analysisResult.userIntent?.description ||
                projectDescription) && (
                <div className="mt-2 text-xs leading-relaxed text-slate-700">
                  <strong className="text-slate-900">
                    What you are creating:{" "}
                  </strong>
                  {analysisResult.userIntent?.description || projectDescription}
                </div>
              )}
              {(analysisResult.userIntent?.concerns || projectConcerns) && (
                <div className="mt-1.5 text-xs leading-relaxed text-slate-700">
                  <strong className="text-slate-900">
                    Problems to investigate:{" "}
                  </strong>
                  {analysisResult.userIntent?.concerns || projectConcerns}
                </div>
              )}
            </div>
          )}

          {/* Executive Summary Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Executive Summary
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {analysisResult.summary}
            </p>
            {analysisResult.scoring.note && (
              <p className="mt-2 text-xs italic text-amber-700">
                ℹ️ {analysisResult.scoring.note}
              </p>
            )}
          </div>

          {/* SPOF Banner with Blast Radius & Dominated Nodes */}
          {analysisResult.spofs.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/85 p-4 text-rose-950">
              <div className="flex items-center gap-2">
                <AlertOctagon size={18} className="text-rose-600 shrink-0" />
                <h4 className="text-xs font-bold text-rose-900">
                  {analysisResult.spofs.length} Critical Single Point(s) of Failure (Dominator Analysis):
                </h4>
              </div>
              <p className="mt-1 text-[11px] text-rose-700">
                Outages on these articulation points sever all directed client paths to downstream services.
              </p>

              <div className="mt-3 space-y-2">
                {analysisResult.spofs.map((id) => {
                  const spofFinding = spofFindingsMap.get(id);
                  const blastRadius = spofFinding?.blastRadius ?? 1;
                  const dominates = spofFinding?.dominates || [];

                  return (
                    <div
                      key={id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-rose-200 bg-white p-2.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleNodeClick(id)}
                          className="flex items-center gap-1.5 rounded-md bg-rose-100 hover:bg-rose-200 px-2 py-1 font-mono text-xs font-bold text-rose-800 transition cursor-pointer"
                          title="Click to focus on canvas"
                        >
                          <span>{getNodeLabel(id)}</span>
                          <Crosshair size={11} className="text-rose-600" />
                        </button>

                        <span className="rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          💥 Blast Radius: {blastRadius} downstream {blastRadius === 1 ? "node" : "nodes"}
                        </span>
                      </div>

                      {dominates.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[10.5px] text-rose-600">
                          <span className="font-semibold text-slate-500">
                            Dominates:
                          </span>
                          {dominates.map((domId) => (
                            <button
                              key={domId}
                              type="button"
                              onClick={() => handleNodeClick(domId)}
                              className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                              title={`Dominated node: ${getNodeLabel(domId)}`}
                            >
                              {getNodeLabel(domId)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Circular Dependencies Banner */}
          {analysisResult.cycles && analysisResult.cycles.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900">
              <AlertTriangle
                className="mt-0.5 shrink-0 text-amber-600"
                size={18}
              />
              <div className="text-xs">
                <strong className="font-bold">
                  {analysisResult.cycles.length} Synchronous Circular Dependency Cycle(s):
                </strong>
                <div className="mt-1.5 space-y-1">
                  {analysisResult.cycles.map((cycle, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-amber-900"
                    >
                      {cycle.map((id, cIdx) => (
                        <span key={cIdx} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleNodeClick(id)}
                            className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800 hover:bg-amber-200 transition cursor-pointer"
                          >
                            {getNodeLabel(id)}
                          </button>
                          {cIdx < cycle.length - 1 && <span>→</span>}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Disconnected Orphans Banner */}
          {analysisResult.orphanNodes &&
            analysisResult.orphanNodes.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-slate-800">
                <AlertCircle
                  className="mt-0.5 shrink-0 text-slate-500"
                  size={18}
                />
                <div className="text-xs">
                  <strong className="font-bold">
                    {analysisResult.orphanNodes.length} Disconnected Component(s):
                  </strong>
                  <p className="mt-0.5 text-slate-500">
                    These components have 0 connections and do not participate in request flows.
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {analysisResult.orphanNodes.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleNodeClick(id)}
                        className="rounded bg-slate-200 hover:bg-slate-300 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                      >
                        {getNodeLabel(id)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          {/* Unreachable Nodes Banner */}
          {analysisResult.unreachableNodes &&
            analysisResult.unreachableNodes.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50/80 p-3.5 text-purple-900">
                <Workflow
                  className="mt-0.5 shrink-0 text-purple-600"
                  size={18}
                />
                <div className="text-xs">
                  <strong className="font-bold">
                    {analysisResult.unreachableNodes.length} Unreachable Backend Component(s):
                  </strong>
                  <p className="mt-0.5 text-purple-700">
                    No directed request path reaches these components from any client or entry point.
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {analysisResult.unreachableNodes.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleNodeClick(id)}
                        className="rounded bg-purple-100 hover:bg-purple-200 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-800 transition cursor-pointer"
                      >
                        {getNodeLabel(id)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          {/* Categorized Findings Section */}
          <div>
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <h4 className="text-sm font-bold text-slate-800">
                Findings ({severityCounts.total})
              </h4>

              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSeverityFilter("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    severityFilter === "ALL"
                      ? "bg-slate-800 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All ({severityCounts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setSeverityFilter("CRITICAL")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    severityFilter === "CRITICAL"
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  <span>Critical</span>
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] text-rose-800">
                    {severityCounts.critical}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSeverityFilter("WARNING")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    severityFilter === "WARNING"
                      ? "bg-amber-600 text-white shadow-2xs"
                      : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  <span>Warning</span>
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] text-amber-800">
                    {severityCounts.warning}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSeverityFilter("INFO")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    severityFilter === "INFO"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <span>Info</span>
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] text-blue-800">
                    {severityCounts.info}
                  </span>
                </button>
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 py-8 text-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-emerald-900">
                  No {severityFilter !== "ALL" ? severityFilter.toLowerCase() : ""} findings!
                </p>
                <p className="text-xs text-emerald-700">
                  {severityFilter === "ALL"
                    ? "Architecture satisfies all security, reliability, and topology rules."
                    : `No findings matching severity "${severityFilter.toLowerCase()}".`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFindings.map((finding, idx) => {
                  const sev = (finding.severity || "").toUpperCase();
                  const isCritical = sev === "CRITICAL";
                  const isWarning = sev === "WARNING";
                  const isSpofFinding =
                    finding.ruleId === "SPOF_CRITICAL_PATH" ||
                    finding.isSpof === true ||
                    finding.title.toLowerCase().includes("single point of failure");

                  const badgeStyle = isCritical
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : isWarning
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-blue-100 text-blue-800 border-blue-200";

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-4 shadow-2xs transition ${
                        isSpofFinding
                          ? "border-rose-300 bg-rose-50/30"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {/* Finding Title & Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isCritical ? (
                            <ShieldAlert
                              size={16}
                              className="text-rose-600 shrink-0"
                            />
                          ) : isWarning ? (
                            <AlertTriangle
                              size={16}
                              className="text-amber-500 shrink-0"
                            />
                          ) : (
                            <Info size={16} className="text-blue-500 shrink-0" />
                          )}
                          <span className="text-sm font-bold text-slate-800">
                            {finding.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isSpofFinding && (
                            <span className="rounded-md border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 uppercase tracking-wide">
                              💥 SPOF
                            </span>
                          )}
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${badgeStyle}`}
                          >
                            {sev}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {finding.description}
                      </p>

                      {/* SPOF Dominator Detail Card */}
                      {isSpofFinding && (
                        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-900">
                              Dominator Analysis:
                            </span>
                            <span className="rounded bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              Blast Radius: {finding.blastRadius ?? 1} downstream {finding.blastRadius === 1 ? "node" : "nodes"}
                            </span>
                          </div>

                          {finding.dominates && finding.dominates.length > 0 && (
                            <div className="mt-2">
                              <span className="text-[11px] font-medium text-rose-800">
                                Downstream Dominated Nodes (severed on failure):
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {finding.dominates.map((domId) => (
                                  <button
                                    key={domId}
                                    type="button"
                                    onClick={() => handleNodeClick(domId)}
                                    className="flex items-center gap-1 rounded bg-white px-2 py-0.5 font-mono text-[10.5px] font-semibold text-rose-800 border border-rose-300 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                                    title={`Click to inspect ${getNodeLabel(domId)} on canvas`}
                                  >
                                    <span>{getNodeLabel(domId)}</span>
                                    <Crosshair size={10} className="text-rose-500" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remediation Action */}
                      {(finding.remediation || finding.recommendation) && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                          <strong className="text-slate-900">
                            Recommended Action:{" "}
                          </strong>
                          {finding.remediation || finding.recommendation}
                        </div>
                      )}

                      {/* Affected Nodes & Locate on Canvas */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
                          <span>Affected:</span>
                          {finding.affectedNodes && finding.affectedNodes.length > 0 ? (
                            finding.affectedNodes.map((id) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => handleNodeClick(id)}
                                title={`Focus ${getNodeLabel(id)} on canvas`}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-1.5 py-0.5 font-mono text-slate-700 border border-slate-200 transition cursor-pointer"
                              >
                                <span>{getNodeLabel(id)}</span>
                                <Crosshair size={9} />
                              </button>
                            ))
                          ) : (
                            <span className="italic text-slate-400">
                              Topology-wide
                            </span>
                          )}
                        </div>

                        {finding.affectedNodes && finding.affectedNodes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleFindingFocus(finding)}
                            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Locate on canvas</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Skipped Traffic Rules Note */}
          {analysisResult.scoring.skippedRules &&
            analysisResult.scoring.skippedRules.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Info size={14} className="text-slate-400" />
                  <span>
                    Skipped Traffic Checks (
                    {analysisResult.scoring.skippedRules.length})
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
                  {analysisResult.scoring.skippedRules.map((sr) => (
                    <li key={sr.code} className="flex items-start gap-1.5">
                      <span className="text-slate-400">•</span>
                      <span>
                        <strong className="text-slate-700">
                          {sr.name}:{" "}
                        </strong>
                        {sr.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            onClick={onClose}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalysisModal;
