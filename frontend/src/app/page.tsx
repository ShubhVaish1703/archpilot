"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlowProvider,
  useReactFlow,
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  ArrowDownUp,
  Check,
  CheckCircle2,
  Download,
  FileText,
  GitBranch,
  Loader2,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X,
} from "lucide-react";

import "@xyflow/react/dist/style.css";

import type {
  ComponentKind,
  EdgeData,
  ArchitectureNodeData,
  Finding,
  AnalysisResult,
} from "@/components/types";
import {
  nodeStyles,
  componentColorClasses,
  componentCatalog,
  getNodeStyle,
} from "@/components/NodeStyles";
import {
  getEdgeStyleProps,
  normalizeEdge,
} from "@/components/EdgeStyles";
import {
  layoutArchitectureGraph,
  getDefaultPositionForKind,
} from "@/components/GraphLayout";
import { ComponentPalette } from "@/components/ComponentPalette";
import { EdgeInspector } from "@/components/EdgeInspector";
import { AnalysisModal } from "@/components/AnalysisModal";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const QUICK_TOPICS = [
  "Single Points of Failure",
  "Database Read/Write Bottleneck",
  "Missing Load Balancer",
  "Queue Overflow & Worker Loss",
  "Direct DB Access Breaches",
  "Circular Deadlocks",
];

const SCALE_PRESETS = [
  { label: "MVP (300 RPS)", rps: "300", users: "5000", activeClass: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  { label: "Growth (5k RPS)", rps: "5000", users: "100000", activeClass: "border-indigo-300 bg-indigo-50 text-indigo-800" },
  { label: "High-Scale (50k+ RPS)", rps: "50000", users: "1000000", activeClass: "border-purple-300 bg-purple-50 text-purple-800" },
];

const initialNodes: Node<ArchitectureNodeData>[] = [
  { id: "client-1", type: "default", position: { x: 60, y: 120 }, data: { label: "Client", kind: "client" } },
  { id: "api-1", type: "default", position: { x: 290, y: 120 }, data: { label: "API Gateway", kind: "api" } },
  { id: "lb-1", type: "default", position: { x: 520, y: 120 }, data: { label: "Load Balancer", kind: "loadbalancer" } },
  { id: "server-1", type: "default", position: { x: 750, y: 120 }, data: { label: "App Server", kind: "server" } },
  { id: "cache-1", type: "default", position: { x: 990, y: 40 }, data: { label: "Cache", kind: "cache" } },
  { id: "db-1", type: "default", position: { x: 990, y: 200 }, data: { label: "Database", kind: "database" } },
];

const initialEdgesConfig: Array<{ id: string; source: string; target: string; data: EdgeData }> = [
  { id: "client-api", source: "client-1", target: "api-1", data: { type: "sync", protocol: "https", encrypted: true } },
  { id: "api-lb", source: "api-1", target: "lb-1", data: { type: "sync", protocol: "http", encrypted: false } },
  { id: "lb-server", source: "lb-1", target: "server-1", data: { type: "sync", protocol: "http", encrypted: false } },
  { id: "server-cache", source: "server-1", target: "cache-1", data: { type: "sync", protocol: "tcp", encrypted: false } },
  { id: "server-db", source: "server-1", target: "db-1", data: { type: "sync", protocol: "tcp", encrypted: false } },
];

const initialEdges: Edge<EdgeData>[] = initialEdgesConfig.map((e) => ({
  ...e,
  animated: true,
  ...getEdgeStyleProps(e.data),
}));

function Workspace() {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ArchitectureNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeData>>(initialEdges);

  const [selectedNode, setSelectedNode] = useState<Node<ArchitectureNodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<EdgeData> | null>(null);

  const [projectName, setProjectName] = useState("Untitled Architecture");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectConcerns, setProjectConcerns] = useState("");
  const [peakRps, setPeakRps] = useState<string>("");
  const [expectedUsers, setExpectedUsers] = useState<string>("");
  const [inspectorTab, setInspectorTab] = useState<"component" | "intent">("intent");

  const router = useRouter();
  const [saved, setSaved] = useState(true);
  const [showInspector, setShowInspector] = useState(true);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [appliedToast, setAppliedToast] = useState<{ message: string; variantName?: string } | null>(null);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [contextInputError, setContextInputError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(7);

  // Check if an architecture was applied from the /variants page
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const appliedRaw = sessionStorage.getItem("archpilot_applied_architecture");
        if (appliedRaw) {
          const parsed = JSON.parse(appliedRaw);
          if (parsed.nodes && parsed.edges) {
            const spacedNodes = layoutArchitectureGraph(parsed.nodes);
            setNodes(spacedNodes);
            const normalizedEdges = parsed.edges.map((e: Edge) => normalizeEdge(e));
            setEdges(normalizedEdges);
            setSaved(false);
            const name = parsed.variantName || "Architecture variant";
            setAppliedToast({ message: `Applied "${name}" to canvas!`, variantName: name });
            setTimeout(() => setAppliedToast(null), 5000);
          }
        }
      } catch (e) {
        console.error("Failed to load applied architecture from sessionStorage", e);
      } finally {
        sessionStorage.removeItem("archpilot_applied_architecture");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [setNodes, setEdges]);

  // Centralized edge serialization guaranteeing type defaults to "sync"
  const serializeEdges = useCallback((edgesList: Edge<EdgeData>[]) => {
    return edgesList.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: {
        type: edge.data?.type || "sync",
        ...(edge.data?.protocol ? { protocol: edge.data.protocol } : {}),
        encrypted: Boolean(edge.data?.encrypted),
      },
    }));
  }, []);

  const handleGenerateVariants = async () => {
    if (!projectDescription.trim() && !projectConcerns.trim()) {
      setShowInspector(true);
      setInspectorTab("intent");
      setContextInputError("Please provide context: describe your system goals or concerns before generating AI variants.");
      return;
    }

    setContextInputError(null);
    setIsGeneratingVariants(true);

    try {
      const trafficFilters = peakRps || expectedUsers
        ? { peakRps: peakRps ? Number(peakRps) : null, expectedUsers: expectedUsers ? Number(expectedUsers) : null }
        : null;

      const response = await fetch(`${API_BASE_URL}/api/generate-variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          description: projectDescription,
          concerns: projectConcerns,
          trafficFilters,
          nodes,
          edges: serializeEdges(edges),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.blockedByGatekeeper) {
          alert(`Gatekeeper Blocked Variant Generation:\n${data.reason || "Please resolve structural flaws before generating variants."}`);
          if (data.originalAnalysis) {
            setAnalysisResult(data.originalAnalysis);
            setShowAnalysisModal(true);
          }
          return;
        }
        throw new Error(data.details || data.error || `Server returned ${response.status}`);
      }

      sessionStorage.setItem("archpilot_variants_data", JSON.stringify(data));
      sessionStorage.setItem("archpilot_project_name", projectName);
      router.push("/variants");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate architecture variants";
      alert(`Could not connect to variant generator at ${API_BASE_URL}.\nMake sure server is running:\n  cd server && npm start\n\nError: ${msg}`);
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const handleAnalyze = async () => {
    if (!projectDescription.trim() && !projectConcerns.trim()) {
      setShowInspector(true);
      setInspectorTab("intent");
      setContextInputError("Please provide context: describe the system you are creating or the problem you are solving before analyzing.");
      return;
    }

    setContextInputError(null);
    setIsAnalyzing(true);

    try {
      const trafficFilters = peakRps || expectedUsers
        ? { peakRps: peakRps ? Number(peakRps) : null, expectedUsers: expectedUsers ? Number(expectedUsers) : null }
        : null;

      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          description: projectDescription,
          concerns: projectConcerns,
          trafficFilters,
          nodes,
          edges: serializeEdges(edges),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data: AnalysisResult = await response.json();
      setAnalysisResult(data);
      setShowAnalysisModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze architecture";
      alert(`Could not connect to analysis engine at ${API_BASE_URL}.\nMake sure server is running:\n  cd server && npm start\n\nError: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      const defaultData: EdgeData = { type: "sync", encrypted: false };
      const styleProps = getEdgeStyleProps(defaultData);
      setEdges((currentEdges) =>
        addEdge(
          { ...connection, animated: true, data: defaultData, ...styleProps },
          currentEdges,
        ),
      );
      setSaved(false);
    },
    [setEdges],
  );

  const handleUpdateEdge = useCallback(
    (edgeId: string, updates: Partial<EdgeData>) => {
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id !== edgeId) return edge;
          const currentData = (edge.data || {}) as EdgeData;
          const updatedData: EdgeData = { ...currentData, ...updates };
          const styleProps = getEdgeStyleProps(updatedData);
          return {
            ...edge,
            data: updatedData,
            ...styleProps,
            style: { ...edge.style, ...styleProps.style },
          };
        }),
      );
      setSelectedEdge((current) => {
        if (!current || current.id !== edgeId) return current;
        const currentData = (current.data || {}) as EdgeData;
        const updatedData: EdgeData = { ...currentData, ...updates };
        const styleProps = getEdgeStyleProps(updatedData);
        return {
          ...current,
          data: updatedData,
          ...styleProps,
          style: { ...current.style, ...styleProps.style },
        };
      });
      setSaved(false);
    },
    [setEdges],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((current) => current.filter((e) => e.id !== edgeId));
      setSelectedEdge(null);
      setSaved(false);
    },
    [setEdges],
  );

  const addComponent = useCallback(
    (kind: ComponentKind, position?: { x: number; y: number }) => {
      const component = componentCatalog.find((item) => item.kind === kind);
      if (!component) return;

      const id = `node-${idRef.current++}`;
      const existingSameKind = nodes.filter((n) => n.data?.kind === kind).length;
      const defaultPosition = getDefaultPositionForKind(kind, existingSameKind);

      const newNode: Node<ArchitectureNodeData> = {
        id,
        type: "default",
        position: position ?? defaultPosition,
        data: { label: component.label, kind },
        style: getNodeStyle(kind),
      };

      setNodes((currentNodes) => [...currentNodes, newNode]);
      setSelectedNode(newNode);
      setSelectedEdge(null);
      setInspectorTab("component");
      setSaved(false);
    },
    [nodes, setNodes],
  );

  const onDragStart = (event: DragEvent<HTMLButtonElement>, kind: ComponentKind) => {
    event.dataTransfer.setData("application/archpilot", kind);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/archpilot") as ComponentKind;
    if (!componentCatalog.some((item) => item.kind === kind)) return;

    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addComponent(kind, position);
  };

  const updateSelectedLabel = (label: string) => {
    if (!selectedNode) return;
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNode.id ? { ...node, data: { ...node.data, label } } : node,
      ),
    );
    setSelectedNode((current) => current ? { ...current, data: { ...current.data, label } } : current);
    setSaved(false);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    const id = selectedNode.id;
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    setSelectedNode(null);
    if (selectedEdge && (selectedEdge.source === id || selectedEdge.target === id)) {
      setSelectedEdge(null);
    }
    setSaved(false);
  };

  const exportDiagram = () => {
    const diagram = {
      name: projectName,
      description: projectDescription,
      concerns: projectConcerns,
      nodes,
      edges: serializeEdges(edges),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(diagram, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "architecture.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Inspect SPOF status of currently selected node for inspector detail
  const isSelectedNodeSpof = Boolean(
    selectedNode &&
      (analysisResult?.spofs?.includes(selectedNode.id) ||
        analysisResult?.findings?.some(
          (f) => (f.ruleId === "SPOF_CRITICAL_PATH" || f.isSpof) && f.affectedNodes?.includes(selectedNode.id),
        )),
  );

  const selectedNodeSpofFinding = isSelectedNodeSpof && selectedNode
    ? analysisResult?.findings?.find(
        (f) => (f.ruleId === "SPOF_CRITICAL_PATH" || f.isSpof) && f.affectedNodes?.includes(selectedNode.id),
      )
    : undefined;

  const selectedNodeBlastRadius =
    selectedNodeSpofFinding?.blastRadius ?? selectedNodeSpofFinding?.dominates?.length ?? 1;

  const selectedNodeDominatedLabels = (selectedNodeSpofFinding?.dominates || []).map(
    (id) => nodes.find((n) => n.id === id)?.data?.label || id,
  );

  // Compute node decorations with SPOF halo and hover tooltips
  const displayNodes = useMemo(() => {
    const spofs = new Set(analysisResult?.spofs || []);
    const cycles = new Set(analysisResult?.cycles?.flat() || []);
    const orphans = new Set(analysisResult?.orphanNodes || []);
    const unreachables = new Set(analysisResult?.unreachableNodes || []);

    const spofFindingsMap = new Map<string, Finding>();
    analysisResult?.findings?.forEach((f) => {
      if (f.ruleId === "SPOF_CRITICAL_PATH" || f.isSpof) {
        f.affectedNodes?.forEach((id) => spofFindingsMap.set(id, f));
      }
    });

    return nodes.map((node) => {
      const isSpof = spofs.has(node.id) || spofFindingsMap.has(node.id);
      const spofFinding = spofFindingsMap.get(node.id);

      let spofTooltip: string | undefined;
      let blastRadius: number | undefined;
      let dominates: string[] | undefined;

      if (isSpof) {
        blastRadius = spofFinding?.blastRadius ?? spofFinding?.dominates?.length ?? 1;
        dominates = spofFinding?.dominates || [];
        const dominatedLabels = dominates.map((id) => nodes.find((n) => n.id === id)?.data?.label || id);
        spofTooltip = `⚠️ SPOF (Single Point of Failure)\nBlast Radius: ${blastRadius} downstream ${
          blastRadius === 1 ? "node" : "nodes"
        }\nDominates: ${dominatedLabels.length > 0 ? dominatedLabels.join(", ") : "None"}`;
      }

      return {
        ...node,
        style: getNodeStyle(node.data.kind as ComponentKind, {
          isSpof,
          isInCycle: cycles.has(node.id),
          isOrphan: orphans.has(node.id),
          isUnreachable: unreachables.has(node.id),
        }),
        domAttributes: spofTooltip ? { title: spofTooltip } : undefined,
        ariaLabel: spofTooltip || node.data.label,
        data: {
          ...node.data,
          isSpof,
          blastRadius,
          dominates,
        },
      };
    });
  }, [nodes, analysisResult]);

  return (
    <main className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* Application Header */}
      <header className="z-10 flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 shadow-xs">
        <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <GitBranch size={21} />
          </div>
          <span>ArchPilot</span>
          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-indigo-700">BETA</span>
        </div>

        <div className="flex min-w-[220px] flex-1 flex-col items-start gap-1 px-2 sm:flex-row sm:items-center sm:gap-3">
          <input
            aria-label="Project name"
            className="w-full max-w-[240px] border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none focus:ring-0"
            value={projectName}
            onChange={(event) => {
              setProjectName(event.target.value);
              setSaved(false);
            }}
          />
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Check size={13} />
            {saved ? "All changes saved" : "Unsaved changes"}
          </span>

          <button
            onClick={() => {
              setShowInspector(true);
              setSelectedEdge(null);
              setInspectorTab("intent");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 cursor-pointer"
            title="Describe what you are creating and what problems to look into"
          >
            <Target size={13} className="text-indigo-600" />
            <span>Architecture Goals</span>
            {(projectDescription || projectConcerns) && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            onClick={exportDiagram}
          >
            <Download size={15} />
            Export JSON
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={15} className="animate-spin text-slate-500" />
                Analyzing...
              </>
            ) : (
              <>
                <Activity size={15} className="text-slate-600" />
                Analyze design
              </>
            )}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer"
            onClick={handleGenerateVariants}
            disabled={isGeneratingVariants}
          >
            {isGeneratingVariants ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating Variants...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate 4 Variants
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout: Component Palette | Visual Canvas | Inspector */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)_290px]">
        {/* Left Sidebar: Component Catalog & Palette */}
        <ComponentPalette
          onAddComponent={addComponent}
          onDragStart={onDragStart}
        />

        {/* Center: Interactive ReactFlow Canvas */}
        <section className="flex min-h-0 min-w-0 flex-col bg-slate-50">
          <div className="flex min-h-[54px] items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
              <Workflow size={17} />
              <span>Architecture canvas</span>
              <span className="ml-1 hidden rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 sm:inline">
                {nodes.length} nodes · {edges.length} connections
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="auto-layout-canvas-btn"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 cursor-pointer"
                title="Automatically organize nodes across tiered columns"
                onClick={() => {
                  setNodes((currentNodes) => layoutArchitectureGraph(currentNodes));
                  setTimeout(() => { fitView({ padding: 0.2, duration: 400 }); }, 50);
                  setSaved(false);
                }}
              >
                <Sparkles size={13} className="text-indigo-600" />
                <span>Auto-Layout</span>
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
                title="Toggle inspector"
                onClick={() => setShowInspector((value) => !value)}
              >
                <ArrowDownUp size={16} />
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
                title="Clear selection"
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div
            ref={canvasRef}
            className="relative min-h-0 flex-1"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <ReactFlow
              nodes={displayNodes}
              edges={edges}
              onNodesChange={(changes) => {
                onNodesChange(changes);
                setSaved(false);
              }}
              onEdgesChange={(changes) => {
                onEdgesChange(changes);
                setSaved(false);
              }}
              onConnect={onConnect}
              onNodeClick={(_, node) => {
                setSelectedNode(node as Node<ArchitectureNodeData>);
                setSelectedEdge(null);
                setInspectorTab("component");
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdge(edge as Edge<EdgeData>);
                setSelectedNode(null);
                setShowInspector(true);
              }}
              onPaneClick={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
                setInspectorTab("intent");
              }}
              fitView
              deleteKeyCode={["Backspace", "Delete"]}
              defaultEdgeOptions={{
                type: "smoothstep",
                animated: true,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 16,
                  height: 16,
                },
              }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#DDE3ED"
              />
              <Controls />
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) => {
                  const kind = (node.data as ArchitectureNodeData)?.kind;
                  return (kind && nodeStyles[kind]?.border) ?? "#CBD5E1";
                }}
              />
            </ReactFlow>

            {/* Diagnostic Status Footer Pill */}
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-slate-200 bg-white/95 px-3.5 py-2 text-[11px] text-slate-600 shadow-md backdrop-blur">
              {analysisResult ? (
                <>
                  <span className="font-semibold text-slate-800">Status:</span>
                  <span className="flex items-center gap-1 font-medium text-rose-600">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> SPOF
                  </span>
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Cycle
                  </span>
                  <span className="flex items-center gap-1 font-medium text-purple-600">
                    <span className="h-2 w-2 rounded-full bg-purple-500" /> Unreachable
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-500">
                    <span className="h-2 w-2 rounded-full border border-slate-400 bg-slate-200" /> Orphan
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Drag to move · Connect node handles · Click edges/nodes to inspect
                </>
              )}
            </div>
          </div>
        </section>

        {/* Right Sidebar: Edge or Node Inspector */}
        {showInspector && (
          <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-white px-4 py-5 lg:flex">
            {selectedEdge ? (
              <EdgeInspector
                edge={selectedEdge}
                nodes={nodes}
                onUpdateEdge={handleUpdateEdge}
                onDeleteEdge={handleDeleteEdge}
                onClose={() => setSelectedEdge(null)}
              />
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                      {selectedNode && inspectorTab === "component" ? "PROPERTIES" : "DESIGN SCOPE"}
                    </p>
                    <h2 className="text-base font-semibold text-slate-800">
                      {selectedNode && inspectorTab === "component" ? "Inspector" : "Goals & Context"}
                    </h2>
                  </div>
                  <ShieldCheck size={19} className="text-slate-400" />
                </div>

                {/* Segmented Tab Switcher if a node is selected */}
                {selectedNode && (
                  <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
                    <button
                      className={`rounded-md py-1.5 transition cursor-pointer ${
                        inspectorTab === "component"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      onClick={() => setInspectorTab("component")}
                    >
                      Component
                    </button>
                    <button
                      className={`rounded-md py-1.5 transition cursor-pointer ${
                        inspectorTab === "intent"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      onClick={() => setInspectorTab("intent")}
                    >
                      System Goals
                    </button>
                  </div>
                )}

                {selectedNode && inspectorTab === "component" ? (() => {
                  const selectedItem = componentCatalog.find((item) => item.kind === selectedNode.data.kind);
                  const SelectedIcon = selectedItem ? selectedItem.icon : Server;
                  const colorClass = selectedItem
                    ? componentColorClasses[selectedItem.color]
                    : "bg-indigo-50 text-indigo-600 border-indigo-100";

                  return (
                    <div className="flex flex-col gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${colorClass}`}>
                        <SelectedIcon size={22} />
                      </div>

                      <label htmlFor="node-label" className="text-xs font-semibold text-slate-600">
                        Component name
                      </label>
                      <input
                        id="node-label"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        value={selectedNode.data.label}
                        onChange={(event) => updateSelectedLabel(event.target.value)}
                      />

                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs text-slate-500">
                        <span>Component type</span>
                        <strong className="font-semibold capitalize text-slate-700">{selectedNode.data.kind}</strong>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs text-slate-500">
                        <span>Node ID</span>
                        <code className="max-w-[130px] truncate text-[11px] text-slate-700">{selectedNode.id}</code>
                      </div>

                      {/* SPOF Impact Card if this node is identified as a SPOF */}
                      {isSelectedNodeSpof && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-rose-900 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
                            <AlertOctagon size={14} />
                            <span>Single Point of Failure</span>
                          </div>
                          <p className="mt-1 text-xs">
                            Blast Radius: <strong>{selectedNodeBlastRadius} downstream {selectedNodeBlastRadius === 1 ? "node" : "nodes"}</strong>
                          </p>
                          {selectedNodeDominatedLabels.length > 0 && (
                            <p className="mt-1 text-[11px] text-rose-700 leading-relaxed">
                              Severing isolates: {selectedNodeDominatedLabels.join(", ")}
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer"
                        onClick={deleteSelectedNode}
                      >
                        Delete component
                      </button>
                    </div>
                  );
                })() : (
                  <div className="flex flex-col gap-4">
                    {contextInputError && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 shadow-xs">
                        <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                        <div>
                          <strong className="font-semibold">Context Required: </strong>
                          {contextInputError}
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="project-desc" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <FileText size={14} className="text-indigo-600" />
                        <span>What are you creating?</span>
                      </label>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Describe your intended system, workload, or domain.
                      </p>
                      <textarea
                        id="project-desc"
                        rows={3}
                        className={`mt-1.5 w-full rounded-lg border ${
                          contextInputError ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"
                        } bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`}
                        placeholder="e.g. Distributed payment processing system for mobile and web users with high availability and fast checkout..."
                        value={projectDescription}
                        onChange={(e) => {
                          setProjectDescription(e.target.value);
                          if (contextInputError) setContextInputError(null);
                          setSaved(false);
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="project-concerns" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Target size={14} className="text-amber-600" />
                        <span>What problems to look into?</span>
                      </label>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Mention specific bottlenecks, SPOFs, or failure modes.
                      </p>
                      <textarea
                        id="project-concerns"
                        rows={3}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        placeholder="e.g. Check for single points of failure, verify if database bottlenecks under heavy writes, and ensure message queues have consumers..."
                        value={projectConcerns}
                        onChange={(e) => {
                          setProjectConcerns(e.target.value);
                          if (contextInputError) setContextInputError(null);
                          setSaved(false);
                        }}
                      />

                      {/* Quick Topic Suggestion Chips */}
                      <div className="mt-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Quick Topics:
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {QUICK_TOPICS.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => {
                                setProjectConcerns((prev) => {
                                  const trimmed = prev.trim();
                                  if (!trimmed) return chip;
                                  if (trimmed.includes(chip)) return prev;
                                  return `${trimmed}; ${chip}`;
                                });
                                setSaved(false);
                              }}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                            >
                              + {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Optional Workload & Traffic Sizing */}
                    <div className="pt-3 border-t border-slate-100">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Activity size={14} className="text-emerald-600" />
                        <span>Workload &amp; Scale (Optional)</span>
                      </label>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Provide expected peak load to evaluate capacity &amp; sizing rules.
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium">Peak RPS</span>
                          <input
                            type="number"
                            placeholder="e.g. 1000"
                            value={peakRps}
                            onChange={(e) => {
                              setPeakRps(e.target.value);
                              setSaved(false);
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium">Active Users</span>
                          <input
                            type="number"
                            placeholder="e.g. 50000"
                            value={expectedUsers}
                            onChange={(e) => {
                              setExpectedUsers(e.target.value);
                              setSaved(false);
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                      {/* Quick Scale Presets */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {SCALE_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setPeakRps(preset.rps);
                              setExpectedUsers(preset.users);
                              setSaved(false);
                            }}
                            className={`rounded border px-2 py-0.5 text-[10px] font-medium transition cursor-pointer ${
                              peakRps === preset.rps
                                ? `${preset.activeClass} font-bold`
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        {(peakRps || expectedUsers) && (
                          <button
                            type="button"
                            onClick={() => {
                              setPeakRps("");
                              setExpectedUsers("");
                              setSaved(false);
                            }}
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedNode && (
                      <button
                        onClick={() => setInspectorTab("component")}
                        className="mt-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        ← Back to {selectedNode.data.label}
                      </button>
                    )}
                  </div>
                )}

                {/* Analysis Status Ribbon in Sidebar */}
                {analysisResult ? (
                  <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                        <ShieldCheck size={16} />
                        <span>Analysis Complete</span>
                      </div>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        {analysisResult.scoring.overall}/10
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {analysisResult.findings.length === 0
                        ? "No structural anti-patterns detected."
                        : `${analysisResult.findings.length} findings (${analysisResult.spofs.length} SPOF).`}
                    </p>

                    {analysisResult.gatekeeper && (
                      <div
                        className={`mt-2.5 rounded-lg border p-2.5 text-xs ${
                          analysisResult.gatekeeper.canGenerateVariants
                            ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                            : "border-rose-200 bg-rose-50/70 text-rose-900"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          {analysisResult.gatekeeper.canGenerateVariants ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span>Structure Complete</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert size={14} className="text-rose-600" />
                              <span>Design Incomplete</span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed">
                          {analysisResult.gatekeeper.canGenerateVariants
                            ? "Graph connectivity is valid for AI variant generation."
                            : analysisResult.gatekeeper.reason}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => setShowAnalysisModal(true)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 cursor-pointer"
                    >
                      <Sparkles size={13} />
                      View Full Report
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                    <div className="flex items-center gap-2 text-sm text-indigo-700">
                      <Sparkles size={16} />
                      <strong>AI design review</strong>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Click &quot;Analyze design&quot; to evaluate SPOFs, cycles, and security risks.
                    </p>
                    <div className="mt-3 flex items-center gap-2 border-t border-indigo-100 pt-3 text-[11px] text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Engine endpoint: {API_BASE_URL}
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>
        )}
      </div>

      {/* Analysis Results Modal Dialog */}
      <AnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        analysisResult={analysisResult}
        projectName={projectName}
        projectDescription={projectDescription}
        projectConcerns={projectConcerns}
        peakRps={peakRps}
        nodes={nodes}
        onGenerateVariants={handleGenerateVariants}
        isGeneratingVariants={isGeneratingVariants}
        onSelectNode={(nodeId) => {
          const found = nodes.find((n) => n.id === nodeId);
          if (found) {
            setSelectedNode(found);
            setSelectedEdge(null);
            setInspectorTab("component");
            setShowInspector(true);
          }
        }}
      />

      {/* Applied Architecture Notification Banner */}
      {appliedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-2xl border border-emerald-300 bg-white p-4 text-slate-800 shadow-xl transition">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1 text-xs">
            <strong className="block text-sm font-bold text-slate-900">
              {appliedToast.message}
            </strong>
            <p className="text-slate-500 mt-0.5">
              Canvas updated with production topology and relative coordinates.
            </p>
          </div>
          <button
            onClick={() => setAppliedToast(null)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <Workspace />
    </ReactFlowProvider>
  );
}
