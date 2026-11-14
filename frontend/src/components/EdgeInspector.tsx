"use client";

import React from "react";
import {
  ArrowRight,
  Lock,
  ShieldAlert,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import type { Edge, Node } from "@xyflow/react";
import type { EdgeData, EdgeType, EdgeProtocol, ArchitectureNodeData } from "./types";
import { edgeTypeOptions, edgeProtocolOptions, formatEdgeLabelText } from "./EdgeStyles";

export interface EdgeInspectorProps {
  edge: Edge<EdgeData>;
  nodes?: Node<ArchitectureNodeData>[];
  sourceNodeLabel?: string;
  targetNodeLabel?: string;
  sourceNodeKind?: string;
  targetNodeKind?: string;
  onUpdateEdge: (edgeId: string, updates: Partial<EdgeData>) => void;
  onDeleteEdge: (edgeId: string) => void;
  onClose?: () => void;
  className?: string;
}

export function EdgeInspector({
  edge,
  nodes,
  sourceNodeLabel,
  targetNodeLabel,
  sourceNodeKind,
  targetNodeKind,
  onUpdateEdge,
  onDeleteEdge,
  onClose,
  className = "",
}: EdgeInspectorProps) {
  const currentType: EdgeType = edge.data?.type || "sync";
  const currentProtocol: EdgeProtocol | undefined = edge.data?.protocol;
  const isEncrypted: boolean = Boolean(edge.data?.encrypted);

  const resolvedSourceNode = nodes?.find((n) => n.id === edge.source);
  const resolvedTargetNode = nodes?.find((n) => n.id === edge.target);

  const fromLabel =
    sourceNodeLabel || resolvedSourceNode?.data?.label || edge.source;
  const toLabel =
    targetNodeLabel || resolvedTargetNode?.data?.label || edge.target;
  const fromKind =
    sourceNodeKind || resolvedSourceNode?.data?.kind;
  const toKind =
    targetNodeKind || resolvedTargetNode?.data?.kind;

  const handleTypeChange = (nextType: EdgeType) => {
    onUpdateEdge(edge.id, { type: nextType });
  };

  const handleProtocolChange = (protocolVal: string) => {
    const nextProtocol = protocolVal ? (protocolVal as EdgeProtocol) : undefined;
    if (nextProtocol === "https" && !isEncrypted) {
      onUpdateEdge(edge.id, { protocol: nextProtocol, encrypted: true });
    } else {
      onUpdateEdge(edge.id, { protocol: nextProtocol });
    }
  };

  const handleToggleEncryption = () => {
    onUpdateEdge(edge.id, { encrypted: !isEncrypted });
  };

  const formattedPreviewLabel = formatEdgeLabelText(
    currentType,
    currentProtocol,
    isEncrypted
  );

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
            CONNECTION PROPERTIES
          </p>
          <h3 className="text-base font-semibold text-slate-800">
            Edge Inspector
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close inspector"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Connection Endpoint Breadcrumb */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          Flow Path
        </span>
        <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{fromLabel}</span>
            {fromKind && (
              <span className="text-[10px] font-normal text-slate-400 capitalize">
                {fromKind}
              </span>
            )}
          </div>
          <ArrowRight size={14} className="shrink-0 text-slate-400" />
          <div className="flex min-w-0 flex-1 flex-col text-right">
            <span className="truncate">{toLabel}</span>
            {toKind && (
              <span className="text-[10px] font-normal text-slate-400 capitalize">
                {toKind}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-400">
          <span>Edge ID</span>
          <code className="font-mono text-slate-600">{edge.id}</code>
        </div>
      </div>

      {/* Edge Type Selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
          Connection Type
        </label>
        <div className="space-y-1.5">
          {edgeTypeOptions.map((t) => {
            const isSelected = currentType === t.type;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => handleTypeChange(t.type)}
                className={`w-full rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/60 shadow-2xs ring-1 ring-indigo-500"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm tracking-tighter text-indigo-600 font-bold">
                      {t.strokePreview}
                    </span>
                    <strong
                      className={`text-xs font-semibold ${
                        isSelected ? "text-indigo-900" : "text-slate-800"
                      }`}
                    >
                      {t.title}
                    </strong>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.type}
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] leading-4 text-slate-500">
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Protocol Selector */}
      <div>
        <label
          htmlFor="edge-protocol"
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          Communication Protocol
        </label>
        <select
          id="edge-protocol"
          value={currentProtocol || ""}
          onChange={(e) => handleProtocolChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
        >
          {edgeProtocolOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Security Alert if Plaintext HTTP */}
        {currentProtocol === "http" && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900">
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="leading-tight">
              <strong>Security Note:</strong> Client-facing edges with unencrypted HTTP will be flagged by rule{" "}
              <code>SEC_UNENCRYPTED_PATH</code>.
            </p>
          </div>
        )}
      </div>

      {/* Encryption Toggle */}
      <div>
        <button
          type="button"
          onClick={handleToggleEncryption}
          className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
            isEncrypted
              ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-400"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
              isEncrypted
                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-400"
            }`}
          >
            {isEncrypted ? <Lock size={14} /> : <Unlock size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <strong
                className={`text-xs font-semibold ${
                  isEncrypted ? "text-emerald-900" : "text-slate-800"
                }`}
              >
                In-Transit Encryption (TLS)
              </strong>
              <span
                className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
                  isEncrypted
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {isEncrypted ? "Enabled" : "Off"}
              </span>
            </div>
            <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
              Encrypts data in transit. Enforced by rule SEC_UNENCRYPTED_PATH for external client traffic.
            </p>
          </div>
        </button>
      </div>

      {/* Canvas Label Preview */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Canvas Badge Preview:
        </span>
        <div className="mt-1 flex items-center justify-between">
          <code className="rounded bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs">
            {formattedPreviewLabel}
          </code>
          <span className="text-[10.5px] text-slate-400">
            {currentType === "sync"
              ? "Solid"
              : currentType === "async"
              ? "Dashed"
              : "Dotted"}
          </span>
        </div>
      </div>

      {/* Delete Connection Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onDeleteEdge(edge.id)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 hover:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
        >
          <Trash2 size={14} />
          <span>Delete Connection</span>
        </button>
      </div>
    </div>
  );
}

export default EdgeInspector;
