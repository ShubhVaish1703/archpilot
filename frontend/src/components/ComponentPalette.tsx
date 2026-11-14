"use client";

import React, { useState, useMemo, type DragEvent } from "react";
import {
  Boxes,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { ComponentKind, ComponentCategory, ComponentCatalogItem } from "./types";
import { componentCatalog, componentColorClasses } from "./NodeStyles";

const CATEGORIES: Array<"All" | ComponentCategory> = [
  "All",
  "Edge & Entry",
  "Routing & Security",
  "Compute & Queue",
  "Data & Storage",
];

export interface ComponentPaletteProps {
  onAddComponent: (kind: ComponentKind) => void;
  onDragStart?: (
    event: DragEvent<HTMLButtonElement>,
    kind: ComponentKind,
  ) => void;
  className?: string;
}

export function ComponentPalette({
  onAddComponent,
  onDragStart,
  className = "",
}: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | ComponentCategory
  >("All");

  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    kind: ComponentKind,
  ) => {
    event.dataTransfer.setData("application/archpilot", kind);
    event.dataTransfer.effectAllowed = "move";
    if (onDragStart) {
      onDragStart(event, kind);
    }
  };

  const filteredComponents = useMemo(() => {
    return componentCatalog.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.kind.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, selectedCategory]);

  // Group filtered components by category
  const groupedComponents = useMemo(() => {
    const groups: Record<ComponentCategory, ComponentCatalogItem[]> = {
      "Edge & Entry": [],
      "Routing & Security": [],
      "Compute & Queue": [],
      "Data & Storage": [],
    };

    filteredComponents.forEach((comp) => {
      if (groups[comp.category]) {
        groups[comp.category].push(comp);
      }
    });

    return groups;
  }, [filteredComponents]);

  const activeCategories = (
    selectedCategory === "All"
      ? (["Edge & Entry", "Routing & Security", "Compute & Queue", "Data & Storage"] as ComponentCategory[])
      : [selectedCategory]
  ).filter((cat) => groupedComponents[cat]?.length > 0);

  return (
    <aside
      className={`hidden min-h-0 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex ${className}`}
    >
      {/* Workspace Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
            WORKSPACE
          </p>
          <h2 className="text-base font-semibold text-slate-800">Components</h2>
        </div>
        <Boxes size={18} className="text-slate-400" />
      </div>

      <p className="mb-3 text-xs leading-5 text-slate-500">
        Drag a component onto the canvas, or click to add it.
      </p>

      {/* Search Input */}
      <div className="relative mb-2.5">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search 14 components..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="mb-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap transition cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Component List / Grouped Sections */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-0.5">
        {filteredComponents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <p className="text-xs font-semibold text-slate-600">
              No components match &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-2 text-[11px] font-medium text-indigo-600 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          activeCategories.map((cat) => {
            const items = groupedComponents[cat];
            return (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  <span>{cat}</span>
                  <span className="text-[9.5px] font-normal text-slate-400">
                    {items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {items.map((component) => {
                    const Icon = component.icon;
                    const colorClass =
                      componentColorClasses[component.color] ||
                      "bg-slate-50 text-slate-600 border-slate-100";

                    return (
                      <button
                        key={component.kind}
                        type="button"
                        draggable
                        onDragStart={(event) =>
                          handleDragStart(event, component.kind)
                        }
                        onClick={() => onAddComponent(component.kind)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        title={`${component.label} (${component.kind}): ${component.description}`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}
                        >
                          <Icon size={17} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-xs font-semibold text-slate-700">
                            {component.label}
                          </span>
                          <span className="truncate text-[10.5px] leading-3.5 text-slate-400">
                            {component.description}
                          </span>
                        </span>
                        <Plus
                          size={14}
                          className="shrink-0 text-slate-300 transition group-hover:text-indigo-600"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Branding & Pro Tip */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="flex gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-2.5 text-indigo-600">
          <Sparkles size={16} className="shrink-0 mt-0.5" />
          <div>
            <strong className="text-xs font-semibold text-slate-800">
              Design smarter
            </strong>
            <p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
              AI architecture reviews &amp; variant syntheses.
            </p>
          </div>
        </div>
        <p className="mt-3 text-center text-[9px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
          ARCHPILOT · SYSTEM DESIGN WORKSPACE
        </p>
      </div>
    </aside>
  );
}

export default ComponentPalette;
