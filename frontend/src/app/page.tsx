
"use client";

import {
  useCallback,
  useEffect,
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
  MarkerType,
} from "@xyflow/react";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  Check,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  FilePlus2,
  FileText,
  GitBranch,
  HardDrive,
  Info,
  Layers3,
  Loader2,
  Network,
  Plus,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X,
} from "lucide-react";

import "@xyflow/react/dist/style.css";

type ComponentKind =
  | "client"
  | "api"
  | "loadbalancer"
  | "server"
  | "database"
  | "cache"
  | "queue"
  | "storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

type Finding = {
  ruleId: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  affectedNodes: string[];
  remediation: string;
};

type GatekeeperStatus = {
  canGenerateVariants: boolean;
  mode: "BLANK_SLATE" | "COMPLETE_DESIGN" | "INCOMPLETE_DESIGN";
  blockingCount: number;
  blockingFlaws: Finding[];
  reason: string | null;
};

type AnalysisResult = {
  timestamp: string;
  nodesCount: number;
  edgesCount: number;
  userIntent?: {
    description: string;
    concerns: string;
  } | null;
  spofs: string[];
  cycles: string[][];
  orphanNodes?: string[];
  unreachableNodes?: string[];
  connectedComponentsCount?: number;
  findings: Finding[];
  scoring: {
    overall: number;
    dimensions: {
      security: number;
      reliability: number;
      scalability: number;
    };
    partial: boolean;
    note: string;
    skippedRules: { code: string; name: string; reason: string }[];
  };
  gatekeeper?: GatekeeperStatus;
  summary: string;
};

type ArchitectureNodeData = {
  label: string;
  kind: ComponentKind;
};

const componentCatalog: {
  kind: ComponentKind;
  label: string;
  description: string;
  icon: typeof Server;
  color: string;
}[] = [
    {
      kind: "client",
      label: "Client",
      description: "Web or mobile app",
      icon: Cloud,
      color: "violet",
    },
    {
      kind: "api",
      label: "API Gateway",
      description: "Entry point for requests",
      icon: Workflow,
      color: "blue",
    },
    {
      kind: "loadbalancer",
      label: "Load Balancer",
      description: "Traffic distribution",
      icon: Network,
      color: "teal",
    },
    {
      kind: "server",
      label: "App Server",
      description: "Business logic",
      icon: Server,
      color: "cyan",
    },
    {
      kind: "cache",
      label: "Cache",
      description: "Fast in-memory access",
      icon: Layers3,
      color: "amber",
    },
    {
      kind: "database",
      label: "Database",
      description: "Persistent data",
      icon: Database,
      color: "emerald",
    },
    {
      kind: "queue",
      label: "Message Queue",
      description: "Async communication",
      icon: Activity,
      color: "pink",
    },
    {
      kind: "storage",
      label: "Object Storage",
      description: "Files and media",
      icon: HardDrive,
      color: "indigo",
    },
  ];

const componentColorClasses: Record<string, string> = {
  violet: "bg-violet-50 text-violet-600",
  blue: "bg-blue-50 text-blue-600",
  teal: "bg-teal-50 text-teal-600",
  cyan: "bg-cyan-50 text-cyan-700",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-700",
  pink: "bg-pink-50 text-pink-600",
  indigo: "bg-indigo-50 text-indigo-600",
};

const initialNodes: Node<ArchitectureNodeData>[] = [
  {
    id: "client-1",
    type: "default",
    position: { x: 60, y: 120 },
    data: { label: "Client", kind: "client" },
  },
  {
    id: "api-1",
    type: "default",
    position: { x: 290, y: 120 },
    data: { label: "API Gateway", kind: "api" },
  },
  {
    id: "lb-1",
    type: "default",
    position: { x: 520, y: 120 },
    data: { label: "Load Balancer", kind: "loadbalancer" },
  },
  {
    id: "server-1",
    type: "default",
    position: { x: 750, y: 120 },
    data: { label: "App Server", kind: "server" },
  },
  {
    id: "cache-1",
    type: "default",
    position: { x: 990, y: 40 },
    data: { label: "Cache", kind: "cache" },
  },
  {
    id: "db-1",
    type: "default",
    position: { x: 990, y: 200 },
    data: { label: "Database", kind: "database" },
  },
];

const initialEdges = [
  {
    id: "client-api",
    source: "client-1",
    target: "api-1",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  },
  {
    id: "api-lb",
    source: "api-1",
    target: "lb-1",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  },
  {
    id: "lb-server",
    source: "lb-1",
    target: "server-1",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  },
  {
    id: "server-cache",
    source: "server-1",
    target: "cache-1",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  },
  {
    id: "server-db",
    source: "server-1",
    target: "db-1",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  },
];

const nodeStyles: Record<
  ComponentKind,
  { background: string; border: string }
> = {
  client: { background: "#F5F3FF", border: "#C4B5FD" },
  api: { background: "#EFF6FF", border: "#93C5FD" },
  loadbalancer: { background: "#F0FDFA", border: "#5EEAD4" },
  server: { background: "#ECFEFF", border: "#67E8F9" },
  database: { background: "#ECFDF5", border: "#6EE7B7" },
  cache: { background: "#FFFBEB", border: "#FCD34D" },
  queue: { background: "#FDF2F8", border: "#F9A8D4" },
  storage: { background: "#EEF2FF", border: "#A5B4FC" },
};

function getNodeStyle(
  kind: ComponentKind,
  status: {
    isSpof?: boolean;
    isOrphan?: boolean;
    isInCycle?: boolean;
    isUnreachable?: boolean;
  } = {}
) {
  const style = nodeStyles[kind];

  let border = `1px solid ${style.border}`;
  let boxShadow = "0 2px 8px rgba(15, 23, 42, 0.05)";
  let opacity = 1;

  if (status.isSpof) {
    border = "2px solid #EF4444";
    boxShadow = "0 0 16px rgba(239, 68, 68, 0.45)";
  } else if (status.isInCycle) {
    border = "2px solid #F59E0B";
    boxShadow = "0 0 16px rgba(245, 158, 11, 0.45)";
  } else if (status.isOrphan) {
    border = "2px dashed #94A3B8";
    opacity = 0.65;
  } else if (status.isUnreachable) {
    border = "2px dashed #8B5CF6";
    boxShadow = "0 0 12px rgba(139, 92, 246, 0.3)";
  }

  return {
    background: style.background,
    border,
    borderRadius: 12,
    padding: 14,
    width: 170,
    fontWeight: 600,
    fontSize: 13,
    color: "#172033",
    boxShadow,
    opacity,
  };
}

/**
 * Automatically spaces architecture nodes across clear columns and staggers asynchronous pipelines.
 */
function layoutArchitectureGraph(
  nodes: Node<ArchitectureNodeData>[]
): Node<ArchitectureNodeData>[] {
  if (!nodes || nodes.length === 0) return [];

  const roles: Record<string, Node<ArchitectureNodeData>[]> = {
    client: [],
    ingress: [],
    compute: [],
    cache: [],
    queue: [],
    worker: [],
    storage: [],
  };

  nodes.forEach((node) => {
    const kind = node.data?.kind || "server";
    const label = (node.data?.label || "").toLowerCase();

    if (kind === "client") {
      roles.client.push(node);
    } else if (kind === "api" || kind === "loadbalancer") {
      roles.ingress.push(node);
    } else if (kind === "cache") {
      roles.cache.push(node);
    } else if (kind === "queue") {
      roles.queue.push(node);
    } else if (kind === "database" || kind === "storage") {
      roles.storage.push(node);
    } else if (
      label.includes("worker") ||
      label.includes("consumer") ||
      label.includes("ingestion") ||
      label.includes("transcoder") ||
      label.includes("ledger") ||
      label.includes("task")
    ) {
      roles.worker.push(node);
    } else {
      roles.compute.push(node);
    }
  });

  const COL_X = {
    client: 60,
    ingress: 320,
    compute: 580,
    queue: 840,
    cache: 840,
    worker: 1100,
    storage: 1360,
  };

  const getStaggeredY = (index: number, total: number, baseY = 200, stepY = 140) => {
    if (total <= 1) return baseY;
    const startY = baseY - ((total - 1) * stepY) / 2;
    return startY + index * stepY;
  };

  const nodePositions = new Map<string, { x: number; y: number }>();

  roles.client.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.client,
      y: getStaggeredY(i, roles.client.length, 200),
    })
  );

  roles.ingress.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.ingress,
      y: getStaggeredY(i, roles.ingress.length, 200),
    })
  );

  roles.compute.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.compute,
      y: getStaggeredY(i, roles.compute.length, 200),
    })
  );

  roles.cache.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.cache,
      y: getStaggeredY(i, roles.cache.length, 80, 100),
    })
  );

  roles.queue.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.queue,
      y: getStaggeredY(i, roles.queue.length, 320, 120),
    })
  );

  roles.worker.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.worker,
      y: getStaggeredY(i, roles.worker.length, 320, 120),
    })
  );

  roles.storage.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.storage,
      y: getStaggeredY(i, roles.storage.length, 200, 140),
    })
  );

  return nodes.map((node) => ({
    ...node,
    position: nodePositions.get(node.id) || node.position,
  }));
}

function Workspace() {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<ArchitectureNodeData>>(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [selectedNode, setSelectedNode] =
    useState<Node<ArchitectureNodeData> | null>(null);

  const [projectName, setProjectName] =
    useState("Untitled Architecture");

  const [projectDescription, setProjectDescription] = useState("");
  const [projectConcerns, setProjectConcerns] = useState("");
  const [peakRps, setPeakRps] = useState<string>("");
  const [expectedUsers, setExpectedUsers] = useState<string>("");
  const [inspectorTab, setInspectorTab] = useState<"component" | "intent">(
    "intent",
  );

  const router = useRouter();
  const [saved, setSaved] = useState(true);

  const [showInspector, setShowInspector] = useState(true);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [appliedToast, setAppliedToast] = useState<{
    message: string;
    variantName?: string;
  } | null>(null);

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [contextInputError, setContextInputError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(7);

  // Check if an architecture was applied from the /variants page
  useEffect(() => {
    try {
      const appliedRaw = sessionStorage.getItem("archpilot_applied_architecture");
      if (appliedRaw) {
        const parsed = JSON.parse(appliedRaw);
        if (parsed.nodes && parsed.edges) {
          const spacedNodes = layoutArchitectureGraph(parsed.nodes);
          setNodes(spacedNodes);
          setEdges(parsed.edges);
          setSaved(false);
          const name = parsed.variantName || "Architecture variant";
          setAppliedToast({
            message: `Applied "${name}" to canvas!`,
            variantName: name,
          });
          setTimeout(() => setAppliedToast(null), 5000);
        }
      }
    } catch (e) {
      console.error("Failed to load applied architecture from sessionStorage", e);
    } finally {
      sessionStorage.removeItem("archpilot_applied_architecture");
    }
  }, [setNodes, setEdges]);

  const handleGenerateVariants = async () => {
    // 1. Mandatory User Context Enforcement
    if (!projectDescription.trim() && !projectConcerns.trim()) {
      setShowInspector(true);
      setInspectorTab("intent");
      setContextInputError(
        "Please provide context: describe your system goals or concerns before generating AI variants."
      );
      return;
    }

    setContextInputError(null);
    setIsGeneratingVariants(true);

    try {
      const trafficFilters =
        peakRps || expectedUsers
          ? {
              peakRps: peakRps ? Number(peakRps) : null,
              expectedUsers: expectedUsers ? Number(expectedUsers) : null,
            }
          : null;

      const response = await fetch(`${API_BASE_URL}/api/generate-variants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          description: projectDescription,
          concerns: projectConcerns,
          trafficFilters,
          nodes,
          edges,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.blockedByGatekeeper) {
          alert(
            `Gatekeeper Blocked Variant Generation:\n${data.reason || "Please resolve structural flaws before generating variants."}`
          );
          if (data.originalAnalysis) {
            setAnalysisResult(data.originalAnalysis);
            setShowAnalysisModal(true);
          }
          return;
        }
        throw new Error(data.details || data.error || `Server returned ${response.status}`);
      }

      // Save to sessionStorage
      sessionStorage.setItem("archpilot_variants_data", JSON.stringify(data));
      sessionStorage.setItem("archpilot_project_name", projectName);

      // Navigate to /variants
      router.push("/variants");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate architecture variants";
      alert(
        `Could not connect to variant generator at ${API_BASE_URL}.\nMake sure the server is running:\n  cd server && npm start\n\nError: ${msg}`
      );
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const handleAnalyze = async () => {
    // 1. Mandatory User Context Enforcement
    if (!projectDescription.trim() && !projectConcerns.trim()) {
      setShowInspector(true);
      setInspectorTab("intent");
      setContextInputError(
        "Please provide context: describe the system you are creating or the problem you are solving before analyzing."
      );
      return;
    }

    setContextInputError(null);
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const trafficFilters =
        peakRps || expectedUsers
          ? {
              peakRps: peakRps ? Number(peakRps) : null,
              expectedUsers: expectedUsers ? Number(expectedUsers) : null,
            }
          : null;

      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          description: projectDescription,
          concerns: projectConcerns,
          trafficFilters,
          nodes,
          edges,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`,
        );
      }

      const data: AnalysisResult = await response.json();
      setAnalysisResult(data);
      setShowAnalysisModal(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to analyze architecture";
      setAnalysisError(msg);
      alert(
        `Could not connect to analysis engine at ${API_BASE_URL}.\nMake sure the server is running:\n  cd server && npm start\n\nError: ${msg}`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
            },
          },
          currentEdges,
        ),
      );
      setSaved(false);
    },
    [setEdges],
  );

  const addComponent = useCallback(
    (kind: ComponentKind, position?: { x: number; y: number }) => {
      const component = componentCatalog.find(
        (item) => item.kind === kind,
      );

      if (!component) return;

      const id = `node-${idRef.current++}`;

      const newNode: Node<ArchitectureNodeData> = {
        id,
        type: "default",
        position: position ?? {
          x: 180 + (nodes.length % 4) * 45,
          y: 180 + (nodes.length % 5) * 45,
        },
        data: {
          label: component.label,
          kind,
        },
        style: getNodeStyle(kind),
      };

      setNodes((currentNodes) => [
        ...currentNodes,
        newNode,
      ]);

      setSelectedNode(newNode);
      setSaved(false);
    },
    [nodes.length, setNodes],
  );

  const onDragStart = (
    event: DragEvent<HTMLButtonElement>,
    kind: ComponentKind,
  ) => {
    event.dataTransfer.setData("application/archpilot", kind);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const kind = event.dataTransfer.getData(
      "application/archpilot",
    ) as ComponentKind;

    if (!componentCatalog.some((item) => item.kind === kind)) {
      return;
    }

    const bounds = canvasRef.current?.getBoundingClientRect();

    if (!bounds) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addComponent(kind, position);
  };

  const updateSelectedLabel = (label: string) => {
    if (!selectedNode) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNode.id
          ? {
            ...node,
            data: { ...node.data, label },
          }
          : node,
      ),
    );

    setSelectedNode((current) =>
      current
        ? { ...current, data: { ...current.data, label } }
        : current,
    );

    setSaved(false);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;

    const id = selectedNode.id;

    setNodes((current) =>
      current.filter((node) => node.id !== id),
    );

    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== id && edge.target !== id,
      ),
    );

    setSelectedNode(null);
    setSaved(false);
  };

  const exportDiagram = () => {
    const diagram = {
      name: projectName,
      description: projectDescription,
      concerns: projectConcerns,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob(
      [JSON.stringify(diagram, null, 2)],
      { type: "application/json" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "architecture.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="z-10 flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
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
              setInspectorTab("intent");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
            title="Describe what you are creating and what problems to look into"
          >
            <Target size={13} className="text-indigo-600" />
            <span>Architecture Goals</span>
            {(projectDescription || projectConcerns) && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={exportDiagram}
          >
            <Download size={15} />
            Export JSON
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
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
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
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

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <aside className="hidden min-h-0 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-slate-400">WORKSPACE</p>
              <h2 className="text-base font-semibold text-slate-800">Components</h2>
            </div>
            <Boxes size={18} className="text-slate-400" />
          </div>

          <p className="mb-5 text-xs leading-5 text-slate-500">
            Drag a component onto the canvas, or click to add it.
          </p>

          <div className="flex flex-col gap-1.5">
            {componentCatalog.map((component) => {
              const Icon = component.icon;

              return (
                <button
                  key={component.kind}
                  draggable
                  onDragStart={(event) =>
                    onDragStart(event, component.kind)
                  }
                  onClick={() => addComponent(component.kind)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${componentColorClasses[component.color]}`}>
                    <Icon size={18} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-slate-700">
                      {component.label}
                    </span>
                    <span className="text-[11px] leading-4 text-slate-400">
                      {component.description}
                    </span>
                  </span>
                  <Plus size={15} className="shrink-0 text-slate-300 transition group-hover:text-indigo-600" />
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-6">
            <div className="flex gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-indigo-600">
              <Sparkles size={17} />
              <div>
                <strong className="text-xs font-semibold text-slate-800">Design smarter</strong>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">AI architecture reviews are coming soon.</p>
              </div>
            </div>
            <p className="mt-4 text-center text-[9px] font-semibold tracking-[0.12em] text-slate-400">
              ARCHPILOT · SYSTEM DESIGN WORKSPACE
            </p>
          </div>
        </aside>

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
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                title="Toggle inspector"
                onClick={() => setShowInspector((value) => !value)}
              >
                <ArrowDownUp size={16} />
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                title="Clear selection"
                onClick={() => setSelectedNode(null)}
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
              nodes={(() => {
                const spofs = new Set(analysisResult?.spofs || []);
                const cycles = new Set(analysisResult?.cycles?.flat() || []);
                const orphans = new Set(analysisResult?.orphanNodes || []);
                const unreachables = new Set(
                  analysisResult?.unreachableNodes || []
                );

                return nodes.map((node) => ({
                  ...node,
                  style: getNodeStyle(node.data.kind as ComponentKind, {
                    isSpof: spofs.has(node.id),
                    isInCycle: cycles.has(node.id),
                    isOrphan: orphans.has(node.id),
                    isUnreachable: unreachables.has(node.id),
                  }),
                }));
              })()}
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
                setSelectedNode(
                  node as Node<ArchitectureNodeData>,
                );
                setInspectorTab("component");
              }}
              onPaneClick={() => {
                setSelectedNode(null);
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
                  const kind = (
                    node.data as ArchitectureNodeData
                  ).kind;

                  return nodeStyles[kind]?.border ?? "#CBD5E1";
                }}
              />
            </ReactFlow>

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
                  Drag to move · Connect node handles · Scroll to zoom
                </>
              )}
            </div>
          </div>
        </section>

        {showInspector && (
          <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-white px-4 py-5 lg:flex">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-slate-400">
                  {selectedNode && inspectorTab === "component"
                    ? "PROPERTIES"
                    : "DESIGN SCOPE"}
                </p>
                <h2 className="text-base font-semibold text-slate-800">
                  {selectedNode && inspectorTab === "component"
                    ? "Inspector"
                    : "Goals & Context"}
                </h2>
              </div>
              <ShieldCheck size={19} className="text-slate-400" />
            </div>

            {/* Segmented Tab Switcher if a node is selected */}
            {selectedNode && (
              <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
                <button
                  className={`rounded-md py-1.5 transition ${
                    inspectorTab === "component"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  onClick={() => setInspectorTab("component")}
                >
                  Component
                </button>
                <button
                  className={`rounded-md py-1.5 transition ${
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
              const selectedItem = componentCatalog.find(
                (item) => item.kind === selectedNode.data.kind
              );
              const SelectedIcon = selectedItem ? selectedItem.icon : Server;
              const colorClass = selectedItem
                ? componentColorClasses[selectedItem.color]
                : "bg-indigo-50 text-indigo-600";

              return (
                <div className="flex flex-col gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 ${colorClass}`}>
                    <SelectedIcon size={22} />
                  </div>

                  <label htmlFor="node-label" className="text-xs font-semibold text-slate-600">Component name</label>
                  <input
                    id="node-label"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    value={selectedNode.data.label}
                    onChange={(event) =>
                      updateSelectedLabel(event.target.value)
                    }
                  />

                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs text-slate-500">
                    <span>Component type</span>
                    <strong className="font-semibold capitalize text-slate-700">{selectedNode.data.kind}</strong>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs text-slate-500">
                    <span>Node ID</span>
                    <code className="max-w-[130px] truncate text-[11px] text-slate-700">{selectedNode.id}</code>
                  </div>

                  <button
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
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
                  <label
                    htmlFor="project-desc"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                  >
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
                      contextInputError
                        ? "border-amber-400 ring-2 ring-amber-100"
                        : "border-slate-200"
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
                  <label
                    htmlFor="project-concerns"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                  >
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
                    placeholder="e.g. Check for single points of failure, verify if the database will bottleneck under heavy writes, and ensure message queues have consumers..."
                    value={projectConcerns}
                    onChange={(e) => {
                      setProjectConcerns(e.target.value);
                      if (contextInputError) setContextInputError(null);
                      setSaved(false);
                    }}
                  />

                  {/* Suggestion Chips */}
                  <div className="mt-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Quick Topics:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {[
                        "Single Points of Failure",
                        "Database Read/Write Bottleneck",
                        "Missing Load Balancer",
                        "Queue Overflow & Worker Loss",
                        "Direct DB Access Breaches",
                        "Circular Deadlocks",
                      ].map((chip) => (
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
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
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
                    <button
                      type="button"
                      onClick={() => {
                        setPeakRps("300");
                        setExpectedUsers("5000");
                        setSaved(false);
                      }}
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
                        peakRps === "300"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      MVP (300 RPS)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPeakRps("5000");
                        setExpectedUsers("100000");
                        setSaved(false);
                      }}
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
                        peakRps === "5000"
                          ? "border-indigo-300 bg-indigo-50 text-indigo-800 font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Growth (5k RPS)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPeakRps("50000");
                        setExpectedUsers("1000000");
                        setSaved(false);
                      }}
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
                        peakRps === "50000"
                          ? "border-purple-300 bg-purple-50 text-purple-800 font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      High-Scale (50k+ RPS)
                    </button>
                    {(peakRps || expectedUsers) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPeakRps("");
                          setExpectedUsers("");
                          setSaved(false);
                        }}
                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {selectedNode && (
                  <button
                    onClick={() => setInspectorTab("component")}
                    className="mt-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    ← Back to {selectedNode.data.label}
                  </button>
                )}
              </div>
            )}

            {analysisResult ? (
              <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-3.5 shadow-sm">
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
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
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
          </aside>
        )}
      </div>

      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Architecture Evaluation Report
                  </h3>
                  <p className="text-xs text-slate-500">
                    {projectName} · Generated {new Date(analysisResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setShowAnalysisModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Architecture Completeness Gatekeeper Banner */}
              {analysisResult.gatekeeper && (
                analysisResult.gatekeeper.canGenerateVariants ? (
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
                    <button
                      onClick={() => {
                        setShowAnalysisModal(false);
                        handleGenerateVariants();
                      }}
                      disabled={isGeneratingVariants}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
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
                  </div>
                ) : (
                  <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 text-rose-950 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
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
                          <p className="mt-0.5 text-[11px] text-rose-700 leading-relaxed">
                            {analysisResult.gatekeeper.reason}
                          </p>
                        </div>
                      </div>
                    </div>

                    {analysisResult.gatekeeper.blockingFlaws.length > 0 && (
                      <div className="mt-3 border-t border-rose-200/80 pt-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                          Blocking Flaws That Must Be Resolved ({analysisResult.gatekeeper.blockingFlaws.length}):
                        </span>
                        <div className="mt-1.5 space-y-1.5">
                          {analysisResult.gatekeeper.blockingFlaws.map((flaw, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-rose-900">
                              <span className="font-mono text-rose-600">•</span>
                              <div>
                                <strong className="font-semibold text-rose-900">{flaw.title}: </strong>
                                <span className="text-rose-800">{flaw.description}</span>
                                <p className="mt-0.5 text-[11px] font-medium text-rose-600">
                                  Action: {flaw.remediation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Score Ribbon */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="flex flex-col items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-center">
                  <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">
                    Overall Score
                  </span>
                  <div className="mt-1 text-2xl font-black text-indigo-900">
                    {analysisResult.scoring.overall}
                    <span className="text-xs font-semibold text-indigo-400">/10</span>
                  </div>
                  {analysisResult.scoring.partial ? (
                    <span className="mt-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Structural Audit
                    </span>
                  ) : (
                    <span className="mt-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      {peakRps ? `${Number(peakRps).toLocaleString()} RPS Sized` : "Traffic-Sized"}
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

              {/* User Goals & Investigation Scope */}
              {(analysisResult.userIntent?.description ||
                analysisResult.userIntent?.concerns ||
                projectDescription ||
                projectConcerns) && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                    <Target size={14} />
                    <span>Your Architecture Goals & Focus Scope</span>
                  </div>
                  {(analysisResult.userIntent?.description ||
                    projectDescription) && (
                    <div className="mt-2 text-xs leading-relaxed text-slate-700">
                      <strong className="text-slate-900">What you are creating: </strong>
                      {analysisResult.userIntent?.description ||
                        projectDescription}
                    </div>
                  )}
                  {(analysisResult.userIntent?.concerns || projectConcerns) && (
                    <div className="mt-1.5 text-xs leading-relaxed text-slate-700">
                      <strong className="text-slate-900">Problems to investigate: </strong>
                      {analysisResult.userIntent?.concerns || projectConcerns}
                    </div>
                  )}
                </div>
              )}

              {/* Summary Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Executive Summary</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {analysisResult.summary}
                </p>
                {analysisResult.scoring.note && (
                  <p className="mt-2 text-xs italic text-amber-700">
                    ℹ️ {analysisResult.scoring.note}
                  </p>
                )}
              </div>

              {/* Identified SPOFs banner if any */}
              {analysisResult.spofs.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-rose-900">
                  <AlertOctagon className="mt-0.5 shrink-0 text-rose-600" size={18} />
                  <div className="text-xs">
                    <strong className="font-bold">
                      {analysisResult.spofs.length} Critical Single Point(s) of Failure:
                    </strong>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {analysisResult.spofs.map((id) => (
                        <code key={id} className="rounded bg-rose-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-800">
                          {nodes.find((n) => n.id === id)?.data?.label || id}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Circular Dependencies banner if any */}
              {analysisResult.cycles && analysisResult.cycles.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900">
                  <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
                  <div className="text-xs">
                    <strong className="font-bold">
                      {analysisResult.cycles.length} Circular Dependency Cycle(s):
                    </strong>
                    <div className="mt-1.5 space-y-1">
                      {analysisResult.cycles.map((cycle, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-amber-900">
                          {cycle.map((id, cIdx) => (
                            <span key={cIdx} className="flex items-center gap-1">
                              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                                {nodes.find((n) => n.id === id)?.data?.label || id}
                              </code>
                              {cIdx < cycle.length - 1 && <span>→</span>}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Disconnected Orphans banner if any */}
              {analysisResult.orphanNodes && analysisResult.orphanNodes.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-slate-800">
                  <AlertCircle className="mt-0.5 shrink-0 text-slate-500" size={18} />
                  <div className="text-xs">
                    <strong className="font-bold">
                      {analysisResult.orphanNodes.length} Disconnected Component(s):
                    </strong>
                    <p className="mt-0.5 text-slate-500">
                      These components have 0 connections and do not participate in request flows.
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {analysisResult.orphanNodes.map((id) => (
                        <code key={id} className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {nodes.find((n) => n.id === id)?.data?.label || id}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Unreachable Nodes banner if any */}
              {analysisResult.unreachableNodes && analysisResult.unreachableNodes.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50/80 p-3.5 text-purple-900">
                  <Workflow className="mt-0.5 shrink-0 text-purple-600" size={18} />
                  <div className="text-xs">
                    <strong className="font-bold">
                      {analysisResult.unreachableNodes.length} Unreachable Backend Component(s):
                    </strong>
                    <p className="mt-0.5 text-purple-700">
                      No directed request path reaches these components from any client or API Gateway.
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {analysisResult.unreachableNodes.map((id) => (
                        <code key={id} className="rounded bg-purple-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-800">
                          {nodes.find((n) => n.id === id)?.data?.label || id}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Findings Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">
                    Structural Findings ({analysisResult.findings.length})
                  </h4>
                </div>

                {analysisResult.findings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 py-8 text-center">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                    <p className="mt-2 text-sm font-semibold text-emerald-900">
                      Clean architecture!
                    </p>
                    <p className="text-xs text-emerald-700">
                      No structural anti-patterns, circular dependencies, or direct DB breaches detected.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.findings.map((finding, idx) => {
                      const isCritical = finding.severity === "CRITICAL";
                      const isWarning = finding.severity === "WARNING";

                      const badgeStyle = isCritical
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : isWarning
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-blue-100 text-blue-800 border-blue-200";

                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isCritical ? (
                                <ShieldAlert size={16} className="text-rose-600" />
                              ) : (
                                <AlertTriangle size={16} className="text-amber-500" />
                              )}
                              <span className="text-sm font-bold text-slate-800">
                                {finding.title}
                              </span>
                            </div>
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${badgeStyle}`}>
                              {finding.severity}
                            </span>
                          </div>

                          <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            {finding.description}
                          </p>

                          <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                            <strong className="text-slate-900">Recommended Action: </strong>
                            {finding.remediation}
                          </div>

                          {finding.affectedNodes.length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>Affected nodes:</span>
                              {finding.affectedNodes.map((id) => (
                                <code key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                                  {nodes.find((n) => n.id === id)?.data?.label || id}
                                </code>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Skipped Traffic Rules Note */}
              {analysisResult.scoring.skippedRules?.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Info size={14} className="text-slate-400" />
                    <span>Skipped Traffic Checks ({analysisResult.scoring.skippedRules.length})</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
                    {analysisResult.scoring.skippedRules.map((sr) => (
                      <li key={sr.code} className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span>
                          <strong className="text-slate-700">{sr.name}: </strong>
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
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                onClick={() => setShowAnalysisModal(false)}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

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
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xs"
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