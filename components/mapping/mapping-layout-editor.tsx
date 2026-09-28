"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { MappingLokasi } from "@/services/mapping-service";
import {
  getMappingBlokAction,
  getMappingLokasiAction,
  getMappingLayoutAction,
  saveMappingLayoutAction,
} from "@/app/(app)/mapping/actions";
import {
  applyLayout,
  assignedLokasiIds,
  buildGrid,
  canPlaceAisle,
  canPlaceLabel,
  canPlaceSpan,
  clearCell,
  cloneState,
  createEmptyState,
  hasChanges,
  moveCell,
  placeAisle,
  placeLabel,
  placeLokasi,
  resizeCols,
  resizeLokasi,
  resizeRows,
  serializeCells,
  type GridCell,
  type GridState,
} from "./mapping-grid";
import { MappingJenisBulletList } from "./mapping-jenis-list";
import { MappingAddLokasiDialog } from "./mapping-add-lokasi-dialog";
import { MappingEditLokasiDialog } from "./mapping-edit-lokasi-dialog";
import {
  MapChevronLeftIcon,
  MapChevronRightIcon,
  MapCheckCircleIcon,
  MapDragIcon,
  MapGestureIcon,
  MapHorizontalRuleIcon,
  MapLabelIcon,
  MapMinusIcon,
  MapMoveIcon,
  MapPinIcon,
  MapPlusIcon,
  MapRedoIcon,
  MapResetIcon,
  MapRowsIcon,
  MapColsIcon,
  MapSaveIcon,
  MapTrashIcon,
  MapPencilIcon,
  MapUndoIcon,
} from "./mapping-icons";

const PRIMARY = "#0D47A1";
const AISLE_COLOR = "#FFD600";
const LABEL_BG = "#E8F5E9";
const GREEN = "#2E7D32";
const ORANGE = "#E65100";
const ORANGE_ICON = "#EF6C00";

const SLOT_W = 67;
const SLOT_H = 59;
const GUTTER_W = 28;
const HEADER_H = 20;
const MAX_HISTORY = 50;

type EditorMode = "lokasi" | "aisle" | "label";

type Store = {
  state: GridState;
  undo: GridState[];
  redo: GridState[];
};

type DragSource =
  | { kind: "lokasi"; idLokasi: number }
  | { kind: "move"; row: number; col: number; grabRow: number; grabCol: number }
  | null;

type HoverState = {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  color: string;
};

type DialogState =
  | { kind: "cellOptions"; row: number; col: number }
  | { kind: "span"; type: EditorMode; row: number; col: number }
  | { kind: "labelNew"; row: number; col: number }
  | { kind: "labelEdit"; row: number; col: number }
  | { kind: "reset" }
  | { kind: "addLokasi" }
  | { kind: "editLokasi"; row: number; col: number }
  | null;

type ToastState = { text: string; kind: "ok" | "err" } | null;

export function MappingLayoutEditor({ blok }: { blok: string }) {
  const [store, setStore] = useState<Store>(() => ({
    state: createEmptyState(30, 30),
    undo: [],
    redo: [],
  }));
  const [mode, setMode] = useState<EditorMode>("lokasi");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lokasiList, setLokasiList] = useState<MappingLokasi[]>([]);
  const [namaWarehouse, setNamaWarehouse] = useState("");
  const [saving, setSaving] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSource>(null);
  const paintingRef = useRef(false);
  const lastPaintRef = useRef<{ row: number; col: number } | null>(null);
  const suppressClickRef = useRef(false);

  const state = store.state;

  const showToast = (text: string, kind: "ok" | "err") => {
    setToast({ text, kind });
    window.setTimeout(() => {
      setToast((prev) => (prev && prev.text === text ? null : prev));
    }, 3500);
  };

  const applyResults = useCallback(
    (
      lokRes: Awaited<ReturnType<typeof getMappingLokasiAction>>,
      layoutRes: Awaited<ReturnType<typeof getMappingLayoutAction>>,
      blokRes: Awaited<ReturnType<typeof getMappingBlokAction>>,
    ) => {
      if (!lokRes.ok) {
        setLoadError(lokRes.error);
        setLoading(false);
        return;
      }
      setLokasiList(lokRes.lokasis);
      if (blokRes.ok) {
        const found = blokRes.bloks.find((b) => b.blok === blok);
        setNamaWarehouse(found?.namaWarehouse ?? "");
      }
      const lookup = new Map(
        lokRes.lokasis.map((l) => [
          l.idLokasi,
          { idLokasi: l.idLokasi, label: l.label, namaJenis: l.namaJenis, jenisList: l.jenisList },
        ]),
      );
      let next = createEmptyState(30, 30);
      if (layoutRes.ok && layoutRes.layout) {
        next = applyLayout(layoutRes.layout, lookup);
      }
      setStore({ state: next, undo: [], redo: [] });
      setLoading(false);
    },
    [blok],
  );

  const fetchAll = useCallback(
    () =>
      Promise.all([
        getMappingLokasiAction(blok),
        getMappingLayoutAction(blok),
        getMappingBlokAction(),
      ]),
    [blok],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [lokRes, layoutRes, blokRes] = await fetchAll();
      if (cancelled) return;
      applyResults(lokRes, layoutRes, blokRes);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAll, applyResults]);

  useEffect(() => {
    const stopPaint = () => {
      paintingRef.current = false;
      lastPaintRef.current = null;
    };
    window.addEventListener("mouseup", stopPaint);
    return () => window.removeEventListener("mouseup", stopPaint);
  }, []);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    void (async () => {
      const [lokRes, layoutRes, blokRes] = await fetchAll();
      applyResults(lokRes, layoutRes, blokRes);
    })();
  };

  const refreshLokasi = async () => {
    const res = await getMappingLokasiAction(blok);
    if (res.ok) setLokasiList(res.lokasis);
  };

  const applyMutation = (mutate: (s: GridState) => void) => {
    setStore((prev) => {
      const draft = cloneState(prev.state);
      mutate(draft);
      const undo = [...prev.undo, prev.state];
      while (undo.length > MAX_HISTORY) undo.shift();
      return { state: draft, undo, redo: [] };
    });
  };

  const undo = () => {
    setStore((prev) => {
      if (prev.undo.length === 0) return prev;
      const snapshot = prev.undo[prev.undo.length - 1];
      const redo = [...prev.redo, prev.state];
      while (redo.length > MAX_HISTORY) redo.shift();
      return { state: snapshot, undo: prev.undo.slice(0, -1), redo };
    });
  };

  const redo = () => {
    setStore((prev) => {
      if (prev.redo.length === 0) return prev;
      const snapshot = prev.redo[prev.redo.length - 1];
      const undo = [...prev.undo, prev.state];
      while (undo.length > MAX_HISTORY) undo.shift();
      return { state: snapshot, undo, redo: prev.redo.slice(0, -1) };
    });
  };

  const setRows = (rows: number) => {
    if (rows < 1 || rows > 150 || rows === state.rows) return;
    applyMutation((s) => {
      s.grid = resizeRows(s, rows).grid;
      s.rows = rows;
    });
  };

  const setCols = (cols: number) => {
    if (cols < 1 || cols > 150 || cols === state.cols) return;
    applyMutation((s) => {
      s.grid = resizeCols(s, cols).grid;
      s.cols = cols;
    });
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const res = await saveMappingLayoutAction(blok, {
      rows: state.rows,
      cols: state.cols,
      cells: serializeCells(state),
    });
    setSaving(false);
    if (res.ok) {
      showToast(`Layout blok ${blok} berhasil disimpan`, "ok");
    } else {
      showToast(`Gagal menyimpan: ${res.error}`, "err");
    }
  };

  const assigned = useMemo(() => assignedLokasiIds(state), [state]);
  const changed = useMemo(() => hasChanges(state), [state]);
  const available = useMemo(
    () => lokasiList.filter((l) => !assigned.has(l.idLokasi)),
    [lokasiList, assigned],
  );
  const existingIds = useMemo(
    () => new Set(lokasiList.map((l) => l.idLokasi)),
    [lokasiList],
  );
  const placedCells = useMemo(() => {
    const list: GridCell[] = [];
    for (const row of state.grid) {
      for (const cell of row) {
        if (cell.type !== "empty" && cell.type !== "covered") list.push(cell);
      }
    }
    return list;
  }, [state]);

  const activeCell: GridCell | null =
    dialog && "row" in dialog ? state.grid[dialog.row][dialog.col] : null;

  const cellFromEvent = (clientX: number, clientY: number) => {
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor((clientX - rect.left) / SLOT_W);
    const row = Math.floor((clientY - rect.top) / SLOT_H);
    if (row < 0 || col < 0 || row >= state.rows || col >= state.cols) return null;
    return { row, col };
  };

  const handleBodyClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (mode === "aisle") return;
    const pos = cellFromEvent(e.clientX, e.clientY);
    if (!pos) return;
    const cell = state.grid[pos.row][pos.col];
    const oRow = cell.type === "covered" && cell.originRow != null ? cell.originRow : pos.row;
    const oCol = cell.type === "covered" && cell.originCol != null ? cell.originCol : pos.col;
    const origin = state.grid[oRow][oCol];
    if (origin.type !== "empty") {
      setDialog({ kind: "cellOptions", row: oRow, col: oCol });
      return;
    }
    if (mode === "label") {
      setDialog({ kind: "labelNew", row: pos.row, col: pos.col });
    }
  };

  const paintAt = (clientX: number, clientY: number) => {
    const pos = cellFromEvent(clientX, clientY);
    if (!pos) return;
    const last = lastPaintRef.current;
    if (last && last.row === pos.row && last.col === pos.col) return;
    lastPaintRef.current = pos;
    if (state.grid[pos.row][pos.col].type !== "empty") return;
    if (!canPlaceAisle(state, pos.row, pos.col, 1, 1)) return;
    applyMutation((s) => {
      placeAisle(s, pos.row, pos.col, 1, 1);
    });
  };

  const handleBodyMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    suppressClickRef.current = false;
    if (mode !== "aisle" || e.button !== 0) return;
    paintingRef.current = true;
    lastPaintRef.current = null;
    paintAt(e.clientX, e.clientY);
  };

  const handleBodyMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (mode === "aisle" && paintingRef.current && e.buttons === 1) {
      paintAt(e.clientX, e.clientY);
    }
  };

  const startCellDrag = (e: DragEvent<HTMLDivElement>, cell: GridCell) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const grabRow = Math.floor((e.clientY - rect.top) / SLOT_H);
    const grabCol = Math.floor((e.clientX - rect.left) / SLOT_W);
    dragRef.current = {
      kind: "move",
      row: cell.row,
      col: cell.col,
      grabRow,
      grabCol,
    };
    suppressClickRef.current = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${cell.row},${cell.col}`);
  };

  const startLokasiDrag = (e: DragEvent<HTMLDivElement>, idLokasi: number) => {
    dragRef.current = { kind: "lokasi", idLokasi };
    suppressClickRef.current = true;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", String(idLokasi));
  };

  const handleBodyDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const src = dragRef.current;
    const pos = cellFromEvent(e.clientX, e.clientY);
    if (!src || !pos) {
      setHover((prev) => (prev === null ? prev : null));
      return;
    }
    e.dataTransfer.dropEffect = src.kind === "lokasi" ? "copy" : "move";
    let next: HoverState;
    if (src.kind === "lokasi") {
      next = { row: pos.row, col: pos.col, rowSpan: 1, colSpan: 1, color: PRIMARY };
    } else {
      const cell = state.grid[src.row]?.[src.col];
      if (!cell || cell.type === "empty" || cell.type === "covered") {
        setHover((prev) => (prev === null ? prev : null));
        return;
      }
      const row = Math.min(Math.max(pos.row - src.grabRow, 0), state.rows - 1);
      const col = Math.min(Math.max(pos.col - src.grabCol, 0), state.cols - 1);
      const color =
        cell.type === "aisle" ? ORANGE : cell.type === "label" ? GREEN : PRIMARY;
      next = { row, col, rowSpan: cell.rowSpan, colSpan: cell.colSpan, color };
    }
    setHover((prev) =>
      prev &&
      prev.row === next.row &&
      prev.col === next.col &&
      prev.rowSpan === next.rowSpan &&
      prev.colSpan === next.colSpan &&
      prev.color === next.color
        ? prev
        : next,
    );
  };

  const handleBodyDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHover(null);
    const src = dragRef.current;
    dragRef.current = null;
    const pos = cellFromEvent(e.clientX, e.clientY);
    if (!src || !pos) return;
    if (src.kind === "lokasi") {
      const lokasi = lokasiList.find((l) => l.idLokasi === src.idLokasi);
      if (!lokasi) return;
      if (!canPlaceSpan(state, pos.row, pos.col, 1, 1)) return;
      applyMutation((s) => {
        placeLokasi(s, pos.row, pos.col, lokasi, 1, 1);
      });
      return;
    }
    const destRow = Math.min(Math.max(pos.row - src.grabRow, 0), state.rows - 1);
    const destCol = Math.min(Math.max(pos.col - src.grabCol, 0), state.cols - 1);
    if (destRow === src.row && destCol === src.col) return;
    const cell = state.grid[src.row]?.[src.col];
    if (!cell || cell.type === "empty" || cell.type === "covered") return;
    if (destRow + cell.rowSpan > state.rows || destCol + cell.colSpan > state.cols) {
      return;
    }
    applyMutation((s) => {
      moveCell(s, src.row, src.col, destRow, destCol);
    });
  };

  const handleBodyDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setHover(null);
    }
  };

  const closeDialog = () => setDialog(null);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#0D47A1] border-t-transparent" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-700">{loadError}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-[#0D47A1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a3c8a]"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const gridW = state.cols * SLOT_W;
  const gridH = state.rows * SLOT_H;

  return (
    <div className="flex h-full flex-col bg-[#F8F9FA]">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
        <span className="text-xs font-semibold text-gray-700">Ukuran Grid:</span>
        <DimControl
          icon={<MapRowsIcon className="h-3.5 w-3.5" />}
          label="Baris"
          value={state.rows}
          onDecrement={() => setRows(state.rows - 1)}
          onIncrement={() => setRows(state.rows + 1)}
          onCommit={setRows}
        />
        <DimControl
          icon={<MapColsIcon className="h-3.5 w-3.5" />}
          label="Kolom"
          value={state.cols}
          onDecrement={() => setCols(state.cols - 1)}
          onIncrement={() => setCols(state.cols + 1)}
          onCommit={setCols}
        />
        <span className="flex-1" />
        <button
          type="button"
          title="Undo"
          disabled={store.undo.length === 0}
          onClick={undo}
          className="p-1.5 text-gray-700 disabled:text-gray-300"
        >
          <MapUndoIcon className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          title="Redo"
          disabled={store.redo.length === 0}
          onClick={redo}
          className="p-1.5 text-gray-700 disabled:text-gray-300"
        >
          <MapRedoIcon className="h-[18px] w-[18px]" />
        </button>
        <span className="rounded-full bg-[#0D47A1]/[0.08] px-2.5 py-1 text-[11px] font-semibold text-[#0D47A1]">
          {assigned.size} / {lokasiList.length} lokasi
        </span>
        <button
          type="button"
          disabled={!changed}
          onClick={() => setDialog({ kind: "reset" })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:text-gray-300"
        >
          <MapResetIcon className="h-4 w-4" />
          Reset
        </button>
        {saving ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0D47A1] border-t-transparent" />
        ) : (
          <button
            type="button"
            disabled={!changed}
            onClick={() => void save()}
            className="flex items-center gap-1.5 rounded-lg bg-[#0D47A1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a3c8a] disabled:bg-gray-300"
          >
            <MapSaveIcon className="h-4 w-4" />
            Simpan
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto p-6">
          <div className="flex" style={{ width: GUTTER_W + gridW }}>
            <div className="shrink-0">
              <div style={{ height: HEADER_H + 4 }} />
              {Array.from({ length: state.rows }, (_, r) => (
                <div
                  key={r}
                  className="flex items-center justify-center text-[10px] font-medium text-gray-400"
                  style={{ width: GUTTER_W, height: SLOT_H }}
                >
                  {r + 1}
                </div>
              ))}
            </div>
            <div className="shrink-0">
              <div className="flex" style={{ height: HEADER_H }}>
                {Array.from({ length: state.cols }, (_, c) => (
                  <div
                    key={c}
                    className="flex items-center justify-center text-[10px] font-medium text-gray-400"
                    style={{ width: SLOT_W }}
                  >
                    {c + 1}
                  </div>
                ))}
              </div>
              <div style={{ height: 4 }} />
              <div
                ref={bodyRef}
                className={`relative ${mode === "aisle" ? "cursor-crosshair select-none" : ""}`}
                style={{
                  width: gridW,
                  height: gridH,
                  backgroundImage:
                    "linear-gradient(to right, #DEE2E6 0.5px, transparent 0.5px), linear-gradient(to bottom, #DEE2E6 0.5px, transparent 0.5px)",
                  backgroundSize: `${SLOT_W}px ${SLOT_H}px`,
                }}
                onClick={handleBodyClick}
                onMouseDown={handleBodyMouseDown}
                onMouseMove={handleBodyMouseMove}
                onDragOver={handleBodyDragOver}
                onDragLeave={handleBodyDragLeave}
                onDrop={handleBodyDrop}
                onDragEnd={() => {
                  dragRef.current = null;
                  setHover(null);
                }}
              >
                {placedCells.map((cell) => {
                  const lokasi =
                    cell.type === "lokasi" && cell.idLokasi != null
                      ? lokasiList.find((l) => l.idLokasi === cell.idLokasi)
                      : undefined;
                  return (
                    <div
                      key={`${cell.row}-${cell.col}`}
                      draggable
                      onDragStart={(e) => startCellDrag(e, cell)}
                      className="absolute flex flex-col overflow-hidden rounded-md"
                      style={{
                        left: cell.col * SLOT_W,
                        top: cell.row * SLOT_H,
                        width: cell.colSpan * SLOT_W - 3,
                        height: cell.rowSpan * SLOT_H - 3,
                        margin: 1.5,
                        background:
                          cell.type === "aisle"
                            ? AISLE_COLOR
                            : cell.type === "label"
                              ? LABEL_BG
                              : "#FFFFFF",
                        border:
                          cell.type === "lokasi"
                            ? "1.5px solid rgba(13,71,161,0.5)"
                            : cell.type === "aisle"
                              ? "1px solid rgba(245,124,0,0.5)"
                              : "1px solid rgba(46,125,50,0.5)",
                        boxShadow:
                          cell.type === "lokasi"
                            ? "0 2px 4px rgba(13,71,161,0.12)"
                            : "none",
                      }}
                    >
                      {cell.type === "aisle" ? (
                        <div className="flex h-full items-center justify-center">
                          <MapHorizontalRuleIcon
                            className="h-4 w-4"
                            style={{ color: "rgba(239,108,0,0.6)" }}
                          />
                        </div>
                      ) : cell.type === "label" ? (
                        <div className="flex h-full items-center justify-center px-1.5">
                          <span className="line-clamp-2 text-center text-[9px] font-bold leading-tight text-[#1B5E20]">
                            {cell.labelText}
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col pt-1.5">
                          <span
                            className="line-clamp-1 px-1 text-center text-[17px] font-extrabold leading-none"
                            style={{ color: PRIMARY }}
                          >
                            {cell.lokasiLabel}
                          </span>
                          <div className="mx-2.5 mt-1 border-t border-gray-200" />
                          <div className="min-h-0 flex-1 px-1.5 py-0.5">
                            <MappingJenisBulletList items={lokasi?.jenisList ?? []} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {hover && (
                  <div
                    className="pointer-events-none absolute rounded-md border-2"
                    style={{
                      left: hover.col * SLOT_W + 1.5,
                      top: hover.row * SLOT_H + 1.5,
                      width: hover.colSpan * SLOT_W - 3,
                      height: hover.rowSpan * SLOT_H - 3,
                      borderColor: hover.color,
                      background: `${hover.color}2E`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className="shrink-0 border-l border-gray-200 bg-white shadow-[-2px_0_8px_rgba(0,0,0,0.04)] transition-[width] duration-200"
          style={{ width: panelCollapsed ? 40 : 220 }}
        >
          {panelCollapsed ? (
            <div className="flex flex-col items-center pt-1.5">
              <button
                type="button"
                title="Buka panel"
                onClick={() => setPanelCollapsed(false)}
                className="flex h-9 w-10 items-center justify-center rounded-md hover:bg-gray-50"
              >
                <MapChevronLeftIcon className="h-[18px] w-[18px] text-[#0D47A1]" />
              </button>
              <div className="h-px w-full bg-[#EEEEEE]" />
              <span className="mt-3" title="Lokasi">
                <MapPinIcon className="h-[18px] w-[18px]" style={{ color: PRIMARY }} />
              </span>
              <span className="mt-3" title="Jalan / Aisle">
                <MapHorizontalRuleIcon
                  className="h-[18px] w-[18px]"
                  style={{ color: ORANGE_ICON }}
                />
              </span>
              <span className="mt-3" title="Label">
                <MapLabelIcon className="h-[18px] w-[18px]" style={{ color: GREEN }} />
              </span>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex h-[42px] items-center pl-3.5 pr-1.5">
                <span className="flex-1 text-[11px] font-bold tracking-[0.8px] text-gray-500">
                  Alat
                </span>
                <button
                  type="button"
                  title="Tutup panel"
                  onClick={() => setPanelCollapsed(true)}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-50"
                >
                  <MapChevronRightIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="h-px bg-[#EEEEEE]" />
              <div className="flex flex-col gap-1 p-2.5">
                <ToolButton
                  icon={<MapPinIcon className="h-[15px] w-[15px]" />}
                  label="Lokasi"
                  description="Seret ke grid"
                  active={mode === "lokasi"}
                  color={PRIMARY}
                  onClick={() => setMode("lokasi")}
                />
                <ToolButton
                  icon={<MapGestureIcon className="h-[15px] w-[15px]" />}
                  label="Jalan"
                  description="Lukis jalur"
                  active={mode === "aisle"}
                  color={ORANGE}
                  onClick={() => setMode("aisle")}
                />
                <ToolButton
                  icon={<MapLabelIcon className="h-[15px] w-[15px]" />}
                  label="Label"
                  description="Tap sel kosong"
                  active={mode === "label"}
                  color={GREEN}
                  onClick={() => setMode("label")}
                />
              </div>
              <div className="h-px bg-[#EEEEEE]" />

              {mode === "lokasi" ? (
                <>
                  <div className="flex items-center px-3.5 pb-1.5 pt-2.5">
                    <span className="flex-1 text-[10px] font-bold tracking-[0.6px] text-gray-500">
                      Lokasi
                    </span>
                    <span className="rounded-[10px] bg-[#0D47A1]/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-[#0D47A1]">
                      {available.length}
                    </span>
                    <button
                      type="button"
                      title="Tambah lokasi"
                      onClick={() => setDialog({ kind: "addLokasi" })}
                      className="ml-1 flex h-6 w-6 items-center justify-center rounded-md bg-[#0D47A1] text-white hover:bg-[#0a3c8a]"
                    >
                      <MapPlusIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                    {available.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                        <MapCheckCircleIcon className="h-7 w-7 text-gray-300" />
                        <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-gray-400">
                          {"Semua lokasi\n telah ditempatkan"}
                        </p>
                      </div>
                    ) : (
                      available.map((lokasi) => (
                        <LokasiChip
                          key={lokasi.idLokasi}
                          lokasi={lokasi}
                          onDragStart={startLokasiDrag}
                        />
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center px-5 text-center">
                  <div>
                    {mode === "aisle" ? (
                      <MapGestureIcon
                        className="mx-auto h-7 w-7"
                        style={{ color: "rgba(230,81,0,0.4)" }}
                      />
                    ) : (
                      <MapLabelIcon
                        className="mx-auto h-7 w-7"
                        style={{ color: "rgba(46,125,50,0.4)" }}
                      />
                    )}
                    <p className="mt-2.5 whitespace-pre-line text-[11px] leading-relaxed text-gray-400">
                      {mode === "aisle"
                        ? "Tap sel kosong\ndi grid untuk\nmenempatkan jalan"
                        : "Tap sel kosong\ndi grid untuk\nmenambah label"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-gray-200 bg-white px-5 py-2.5">
        <LegendItem bg="#FFFFFF" label="Lokasi" border />
        <LegendItem bg={AISLE_COLOR} label="Jalan / Aisle" />
        <LegendItem bg={LABEL_BG} label="Label" />
        <LegendItem bg="transparent" label="Kosong" />
      </div>

      {dialog?.kind === "cellOptions" && activeCell && (
        <CellOptionsDialog
          cell={activeCell}
          onClose={closeDialog}
          onEditLokasi={() =>
            setDialog({ kind: "editLokasi", row: dialog.row, col: dialog.col })
          }
          onResize={() =>
            setDialog({ kind: "span", type: activeCell.type as EditorMode, row: dialog.row, col: dialog.col })
          }
          onEditLabel={() =>
            setDialog({ kind: "labelEdit", row: dialog.row, col: dialog.col })
          }
          onClear={() => {
            applyMutation((s) => {
              clearCell(s, dialog.row, dialog.col);
            });
            closeDialog();
          }}
        />
      )}

      {dialog?.kind === "span" && activeCell && (
        <SpanPickerDialog
          title={
            dialog.type === "lokasi"
              ? "Ukuran Lokasi"
              : dialog.type === "aisle"
                ? "Ukuran Jalan / Aisle"
                : "Ukuran Label"
          }
          color={
            dialog.type === "lokasi" ? PRIMARY : dialog.type === "aisle" ? ORANGE : GREEN
          }
          initRs={activeCell.rowSpan}
          initCs={activeCell.colSpan}
          canPlace={(rs, cs) =>
            dialog.type === "lokasi"
              ? canPlaceSpan(state, dialog.row, dialog.col, rs, cs, {
                  skipLokasiId: activeCell.idLokasi,
                  skipOriginRow: dialog.row,
                  skipOriginCol: dialog.col,
                })
              : dialog.type === "aisle"
                ? canPlaceAisle(state, dialog.row, dialog.col, rs, cs)
                : canPlaceLabel(state, dialog.row, dialog.col, rs, cs)
          }
          onConfirm={(rs, cs) => {
            const d = dialog;
            const text = activeCell.labelText ?? "";
            applyMutation((s) => {
              if (d.type === "lokasi") resizeLokasi(s, d.row, d.col, rs, cs);
              else if (d.type === "aisle") placeAisle(s, d.row, d.col, rs, cs);
              else placeLabel(s, d.row, d.col, text, rs, cs);
            });
            closeDialog();
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === "labelNew" && (
        <LabelTextDialog
          initText=""
          initRs={1}
          initCs={1}
          showSize={false}
          canPlace={(rs, cs) => canPlaceLabel(state, dialog.row, dialog.col, rs, cs)}
          onConfirm={(text, rs, cs) => {
            const d = dialog;
            applyMutation((s) => {
              placeLabel(s, d.row, d.col, text, rs, cs);
            });
            closeDialog();
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === "labelEdit" && activeCell && (
        <LabelTextDialog
          initText={activeCell.labelText ?? ""}
          initRs={activeCell.rowSpan}
          initCs={activeCell.colSpan}
          showSize
          canPlace={(rs, cs) => canPlaceLabel(state, dialog.row, dialog.col, rs, cs)}
          onConfirm={(text, rs, cs) => {
            const d = dialog;
            applyMutation((s) => {
              placeLabel(s, d.row, d.col, text, rs, cs);
            });
            closeDialog();
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === "reset" && (
        <ConfirmDialog
          title="Reset Grid?"
          body="Semua penempatan lokasi dan jalan akan dihapus. Lanjutkan?"
          confirmLabel="Reset"
          onConfirm={() => {
            applyMutation((s) => {
              s.grid = buildGrid(s.rows, s.cols);
            });
            closeDialog();
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === "addLokasi" && (
        <MappingAddLokasiDialog
          blok={blok}
          namaWarehouse={namaWarehouse}
          existingIds={existingIds}
          onSaved={() => {
            closeDialog();
            void refreshLokasi().then(() =>
              showToast("Lokasi berhasil ditambahkan", "ok"),
            );
          }}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === "editLokasi" && activeCell && (
        <MappingEditLokasiDialog
          blok={blok}
          idLokasi={activeCell.idLokasi ?? 0}
          lokasiLabel={activeCell.lokasiLabel ?? ""}
          initialJenisList={
            lokasiList.find((l) => l.idLokasi === activeCell.idLokasi)?.jenisList ?? []
          }
          onSaved={() => {
            closeDialog();
            void refreshLokasi().then(() =>
              showToast("Data lokasi berhasil diperbarui", "ok"),
            );
          }}
          onClose={closeDialog}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          style={{ background: toast.kind === "ok" ? "#4CAF50" : "#F44336" }}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function DimControl({
  icon,
  label,
  value,
  onDecrement,
  onIncrement,
  onCommit,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onCommit: (v: number) => void;
}) {
  const commit = (input: HTMLInputElement) => {
    const raw = parseInt(input.value, 10);
    if (Number.isFinite(raw) && raw >= 1 && raw <= 150) {
      onCommit(raw);
      input.value = String(raw);
    } else {
      input.value = String(value);
    }
  };
  const btn =
    "flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200";
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-600">{icon}</span>
      <span className="text-[11px] text-gray-600">{label}</span>
      <button type="button" onClick={onDecrement} className={btn}>
        <MapMinusIcon className="h-3.5 w-3.5" />
      </button>
      <input
        key={value}
        defaultValue={value}
        inputMode="numeric"
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget);
        }}
        className="h-7 w-11 rounded border border-gray-300 text-center text-[13px] font-bold text-gray-800 outline-none focus:border-[#0D47A1]"
      />
      <button type="button" onClick={onIncrement} className={btn}>
        <MapPlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  description,
  active,
  color,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition"
      style={{
        background: active ? `${color}1A` : "transparent",
        borderColor: active ? `${color}73` : "transparent",
      }}
    >
      <span
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md"
        style={{ background: active ? color : "#F3F4F6", color: active ? "#FFFFFF" : "#9CA3AF" }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-xs font-semibold"
          style={{ color: active ? color : "#4B5563" }}
        >
          {label}
        </span>
        <span
          className="block text-[10px]"
          style={{ color: active ? `${color}B3` : "#9CA3AF" }}
        >
          {description}
        </span>
      </span>
      {active && (
        <span
          className="h-1 w-1 shrink-0 rounded-full"
          style={{ background: color }}
        />
      )}
    </button>
  );
}

function LokasiChip({
  lokasi,
  onDragStart,
}: {
  lokasi: MappingLokasi;
  onDragStart: (e: DragEvent<HTMLDivElement>, idLokasi: number) => void;
}) {
  return (
    <div className="py-1.5">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, lokasi.idLokasi)}
        className="flex w-full cursor-grab items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 active:cursor-grabbing"
      >
        <MapDragIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md px-0.5 text-center text-[8px] font-extrabold leading-none"
          style={{ background: `${PRIMARY}14`, color: PRIMARY }}
        >
          {lokasi.label}
        </span>
        <span
          className={`min-w-0 flex-1 text-[11px] font-semibold ${
            lokasi.namaJenis ? "line-clamp-2 text-gray-600" : "text-gray-400"
          }`}
        >
          {lokasi.namaJenis || "-"}
        </span>
      </div>
    </div>
  );
}

function LegendItem({
  bg,
  label,
  border,
}: {
  bg: string;
  label: string;
  border?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-4 w-4 rounded-[3px]"
        style={{
          background: bg,
          border: `1px solid ${border ? "rgba(13,71,161,0.4)" : "#D1D5DB"}`,
        }}
      />
      <span className="text-[11px] text-gray-700">{label}</span>
    </span>
  );
}

function DialogShell({
  children,
  width,
}: {
  children: ReactNode;
  width: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[85vh] overflow-hidden rounded-2xl bg-white"
        style={{ width, maxWidth: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

function CellOptionsDialog({
  cell,
  onClose,
  onEditLokasi,
  onResize,
  onEditLabel,
  onClear,
}: {
  cell: GridCell;
  onClose: () => void;
  onEditLokasi: () => void;
  onResize: () => void;
  onEditLabel: () => void;
  onClear: () => void;
}) {
  const title =
    cell.type === "lokasi"
      ? `Lokasi: ${cell.lokasiLabel ?? ""}`
      : cell.type === "aisle"
        ? "Jalan / Aisle"
        : cell.type === "label"
          ? `Label: ${cell.labelText ?? ""}`
          : "Sel";
  const accent = cell.type === "lokasi" ? PRIMARY : cell.type === "aisle" ? ORANGE : GREEN;

  const row =
    (icon: ReactNode, text: string, color: string, action: () => void) => (
      <button
        key={text}
        type="button"
        onClick={action}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        <span style={{ color }}>{icon}</span>
        <span style={text === "Hapus" ? { color: "#EF4444" } : undefined}>{text}</span>
      </button>
    );

  return (
    <DialogShell width={340}>
      <div className="px-5 pt-5">
        <p className="text-[15px] font-bold text-gray-800">{title}</p>
      </div>
      <div className="px-3 pb-2 pt-3">
        {cell.type === "lokasi" && (
          <>
            {row(
              <MapPencilIcon className="h-5 w-5" />,
              "Edit Lokasi",
              PRIMARY,
              onEditLokasi,
            )}
            {row(<MapMoveIcon className="h-5 w-5" />, "Resize", accent, onResize)}
          </>
        )}
        {cell.type === "label" && (
          <>
            {row(
              <MapPencilIcon className="h-5 w-5" />,
              "Edit Label",
              GREEN,
              onEditLabel,
            )}
            {row(<MapMoveIcon className="h-5 w-5" />, "Resize", accent, onResize)}
          </>
        )}
        {cell.type === "aisle" && (
          row(<MapMoveIcon className="h-5 w-5" />, "Resize", accent, onResize)
        )}
        {row(<MapTrashIcon className="h-5 w-5" />, "Hapus", "#EF4444", onClear)}
      </div>
      <div className="flex justify-end px-4 pb-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Batal
        </button>
      </div>
    </DialogShell>
  );
}

function SpanPickerDialog({
  title,
  color,
  initRs,
  initCs,
  canPlace,
  onConfirm,
  onClose,
}: {
  title: string;
  color: string;
  initRs: number;
  initCs: number;
  canPlace: (rs: number, cs: number) => boolean;
  onConfirm: (rs: number, cs: number) => void;
  onClose: () => void;
}) {
  const [rowText, setRowText] = useState(String(initRs));
  const [colText, setColText] = useState(String(initCs));
  const [touched, setTouched] = useState(false);

  const rs = parseInt(rowText, 10);
  const cs = parseInt(colText, 10);
  const rowOk = Number.isFinite(rs) && rs >= 1 && rs <= 60;
  const colOk = Number.isFinite(cs) && cs >= 1 && cs <= 60;
  const blocked = rowOk && colOk && !canPlace(rs, cs);
  const rowErr = touched && !rowOk ? "Masukkan angka 1–60" : undefined;
  const colErr = touched
    ? !colOk
      ? "Masukkan angka 1–60"
      : blocked
        ? "Melebihi batas atau terhalang sel lain"
        : undefined
    : undefined;
  const valid = rowOk && colOk && !blocked;

  const field =
    "h-12 w-full rounded-lg border px-2 text-center text-xl font-bold text-gray-800 outline-none";

  return (
    <DialogShell width={320}>
      <div className="px-5 pt-5">
        <p className="text-[15px] font-bold text-gray-800">{title}</p>
      </div>
      <div className="flex items-start gap-3 px-5 pb-2 pt-4">
        <div className="min-w-0 flex-1">
          <input
            value={rowText}
            onChange={(e) => {
              setTouched(true);
              setRowText(e.target.value.replace(/\D/g, ""));
            }}
            className={field}
            style={{ borderColor: rowErr ? "#F87171" : "#D1D5DB" }}
          />
          <p className="mt-1 text-[11px] font-medium text-gray-600">
            Baris (tinggi)
          </p>
          {rowErr && <p className="text-[10px] text-red-500">{rowErr}</p>}
        </div>
        <span className="pt-3 text-lg font-light text-gray-400">×</span>
        <div className="min-w-0 flex-1">
          <input
            value={colText}
            onChange={(e) => {
              setTouched(true);
              setColText(e.target.value.replace(/\D/g, ""));
            }}
            className={field}
            style={{ borderColor: colErr ? "#F87171" : "#D1D5DB" }}
          />
          <p className="mt-1 text-[11px] font-medium text-gray-600">
            Kolom (lebar)
          </p>
          {colErr && <p className="text-[10px] text-red-500">{colErr}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 pb-4 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onConfirm(rs, cs)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: color }}
        >
          Terapkan
        </button>
      </div>
    </DialogShell>
  );
}

function LabelTextDialog({
  initText,
  initRs,
  initCs,
  showSize,
  canPlace,
  onConfirm,
  onClose,
}: {
  initText: string;
  initRs: number;
  initCs: number;
  showSize: boolean;
  canPlace: (rs: number, cs: number) => boolean;
  onConfirm: (text: string, rs: number, cs: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initText);
  const [rowText, setRowText] = useState(String(initRs));
  const [colText, setColText] = useState(String(initCs));
  const [touched, setTouched] = useState(false);

  const rs = parseInt(rowText, 10);
  const cs = parseInt(colText, 10);
  const rowOk = Number.isFinite(rs) && rs >= 1;
  const colOk = Number.isFinite(cs) && cs >= 1;
  const blocked = rowOk && colOk && !canPlace(rs, cs);
  const rowErr = touched && !rowOk ? "Min 1" : undefined;
  const colErr = touched
    ? !colOk
      ? "Min 1"
      : blocked
        ? "Melebihi batas atau terhalang sel lain"
        : undefined
    : undefined;
  const valid = text.trim().length > 0 && rowOk && colOk && !blocked;

  const field =
    "w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-2";
  const spanField =
    "h-11 w-full rounded-lg border px-2 text-center text-base font-bold text-gray-800 outline-none";

  return (
    <DialogShell width={340}>
      <div className="px-5 pt-5">
        <p className="text-[15px] font-bold text-gray-800">Label Teks</p>
      </div>
      <div className="px-5 pb-2 pt-4">
        <textarea
          autoFocus
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Masukkan teks label..."
          className={`${field} resize-none`}
          style={{ borderColor: "#D1D5DB" }}
        />
        {showSize && (
          <>
            <p className="mt-4 text-xs font-semibold text-gray-700">
              Ukuran (baris × kolom):
            </p>
            <div className="mt-2 flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                <input
                  value={rowText}
                  onChange={(e) => {
                    setTouched(true);
                    setRowText(e.target.value.replace(/\D/g, ""));
                  }}
                  className={spanField}
                  style={{ borderColor: rowErr ? "#F87171" : "#D1D5DB" }}
                />
                <p className="mt-1 text-[11px] font-medium text-gray-600">
                  Baris <span className="text-gray-400">≥1</span>
                </p>
                {rowErr && <p className="text-[10px] text-red-500">{rowErr}</p>}
              </div>
              <span className="pt-2 text-lg font-light text-gray-400">×</span>
              <div className="min-w-0 flex-1">
                <input
                  value={colText}
                  onChange={(e) => {
                    setTouched(true);
                    setColText(e.target.value.replace(/\D/g, ""));
                  }}
                  className={spanField}
                  style={{ borderColor: colErr ? "#F87171" : "#D1D5DB" }}
                />
                <p className="mt-1 text-[11px] font-medium text-gray-600">
                  Kolom <span className="text-gray-400">≥1</span>
                </p>
                {colErr && <p className="text-[10px] text-red-500">{colErr}</p>}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onConfirm(text.trim(), rs, cs)}
          className="rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Simpan
        </button>
      </div>
    </DialogShell>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <DialogShell width={340}>
      <div className="px-5 pt-5">
        <p className="text-[15px] font-bold text-gray-800">{title}</p>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
      </div>
      <div className="flex justify-end gap-2 px-4 pb-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}
