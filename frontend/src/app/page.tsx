
"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
} from "react";
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
} from "@xyflow/react";
import {
  Activity,
  ArrowDownUp,
  Boxes,
  Check,
  Cloud,
  Database,
  Download,
  FilePlus2,
  GitBranch,
  HardDrive,
  Layers3,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";

import "@xyflow/react/dist/style.css";

type ComponentKind =
  | "client"
  | "api"
  | "server"
  | "database"
  | "cache"
  | "queue"
  | "storage";

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
      kind: "server",
      label: "App Server",
      description: "Business logic",
      icon: Server,
      color: "cyan",
    },
    {
      kind: "database",
      label: "Database",
      description: "Persistent data",
      icon: Database,
      color: "emerald",
    },
    {
      kind: "cache",
      label: "Cache",
      description: "Fast data access",
      icon: Layers3,
      color: "amber",
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
    position: { x: 100, y: 100 },
    data: { label: "Client", kind: "client" },
  },
  {
    id: "api-1",
    type: "default",
    position: { x: 380, y: 100 },
    data: { label: "API Gateway", kind: "api" },
  },
  {
    id: "server-1",
    type: "default",
    position: { x: 660, y: 100 },
    data: { label: "App Server", kind: "server" },
  },
  {
    id: "db-1",
    type: "default",
    position: { x: 940, y: 100 },
    data: { label: "Database", kind: "database" },
  },
];

const initialEdges = [
  {
    id: "client-api",
    source: "client-1",
    target: "api-1",
    animated: true,
  },
  {
    id: "api-server",
    source: "api-1",
    target: "server-1",
    animated: true,
  },
  {
    id: "server-db",
    source: "server-1",
    target: "db-1",
    animated: true,
  },
];

const nodeStyles: Record<
  ComponentKind,
  { background: string; border: string }
> = {
  client: { background: "#F5F3FF", border: "#C4B5FD" },
  api: { background: "#EFF6FF", border: "#93C5FD" },
  server: { background: "#ECFEFF", border: "#67E8F9" },
  database: { background: "#ECFDF5", border: "#6EE7B7" },
  cache: { background: "#FFFBEB", border: "#FCD34D" },
  queue: { background: "#FDF2F8", border: "#F9A8D4" },
  storage: { background: "#EEF2FF", border: "#A5B4FC" },
};

function getNodeStyle(kind: ComponentKind) {
  const style = nodeStyles[kind];

  return {
    background: style.background,
    border: `1px solid ${style.border}`,
    borderRadius: 12,
    padding: 14,
    width: 170,
    fontWeight: 600,
    fontSize: 13,
    color: "#172033",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
  };
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

  const [saved, setSaved] = useState(true);

  const [showInspector, setShowInspector] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(5);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
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
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => alert("AI review will be added in the next phase.")}
          >
            <Sparkles size={15} />
            Analyze design
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
              nodes={nodes.map((node) => ({
                ...node,
                style: getNodeStyle(
                  node.data.kind as ComponentKind,
                ),
              }))}
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
              onNodeClick={(_, node) =>
                setSelectedNode(
                  node as Node<ArchitectureNodeData>,
                )
              }
              onPaneClick={() => setSelectedNode(null)}
              fitView
              deleteKeyCode={["Backspace", "Delete"]}
              defaultEdgeOptions={{
                type: "smoothstep",
                animated: true,
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

            <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-[11px] text-slate-500 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Drag to move · Connect node handles · Scroll to zoom
            </div>
          </div>
        </section>

        {showInspector && (
          <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-white px-4 py-5 lg:flex">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-slate-400">PROPERTIES</p>
                <h2 className="text-base font-semibold text-slate-800">Inspector</h2>
              </div>
              <ShieldCheck size={19} className="text-slate-400" />
            </div>

            {selectedNode ? (
              <div className="flex flex-col gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <Server size={22} />
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
            ) : (
              <div className="flex flex-col items-center px-3 py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <FilePlus2 size={23} />
                </div>
                <strong className="text-sm font-semibold text-slate-700">No component selected</strong>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Select a node on the canvas to inspect or rename it.
                </p>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <div className="flex items-center gap-2 text-sm text-indigo-700">
                <Sparkles size={16} />
                <strong>AI design review</strong>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Your architecture risks, bottlenecks, and improvement
                suggestions will appear here in a future phase.
              </p>
              <div className="mt-3 flex items-center gap-2 border-t border-indigo-100 pt-3 text-[11px] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Analysis engine not connected
              </div>
            </div>
          </aside>
        )}
      </div>
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