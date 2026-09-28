import type { LayoutCellPayload, MappingLayoutData } from "@/services/mapping-service";

export type CellType = "empty" | "aisle" | "lokasi" | "label" | "covered";

export type GridCell = {
  row: number;
  col: number;
  type: CellType;
  idLokasi: number | null;
  lokasiLabel: string | null;
  lokasiDescription: string | null;
  labelText: string | null;
  rowSpan: number;
  colSpan: number;
  originRow: number | null;
  originCol: number | null;
};

export type GridState = {
  rows: number;
  cols: number;
  grid: GridCell[][];
};

export type GridSnapshot = GridState;

export function createCell(row: number, col: number): GridCell {
  return {
    row,
    col,
    type: "empty",
    idLokasi: null,
    lokasiLabel: null,
    lokasiDescription: null,
    labelText: null,
    rowSpan: 1,
    colSpan: 1,
    originRow: null,
    originCol: null,
  };
}

function resetCell(cell: GridCell): void {
  cell.type = "empty";
  cell.idLokasi = null;
  cell.lokasiLabel = null;
  cell.lokasiDescription = null;
  cell.labelText = null;
  cell.rowSpan = 1;
  cell.colSpan = 1;
  cell.originRow = null;
  cell.originCol = null;
}

export function cloneCell(cell: GridCell): GridCell {
  return { ...cell };
}

export function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map((row) => row.map((cell) => cloneCell(cell)));
}

export function cloneState(state: GridState): GridState {
  return { rows: state.rows, cols: state.cols, grid: cloneGrid(state.grid) };
}

export function buildGrid(
  rows: number,
  cols: number,
  old?: GridCell[][],
): GridCell[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      if (old && r < old.length && c < old[r].length) return cloneCell(old[r][c]);
      return createCell(r, c);
    }),
  );
}

export function createEmptyState(rows = 30, cols = 30): GridState {
  return { rows, cols, grid: buildGrid(rows, cols) };
}

function inBounds(state: GridState, row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < state.rows && col < state.cols;
}

function clearSpan(state: GridState, row: number, col: number): void {
  if (!inBounds(state, row, col)) return;
  const cell = state.grid[row][col];
  const rs = cell.rowSpan;
  const cs = cell.colSpan;
  for (let r = row; r < Math.min(row + rs, state.rows); r++) {
    for (let c = col; c < Math.min(col + cs, state.cols); c++) {
      resetCell(state.grid[r][c]);
    }
  }
}

function clearArea(
  state: GridState,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
): void {
  for (let r = row; r < row + rowSpan && r < state.rows; r++) {
    for (let c = col; c < col + colSpan && c < state.cols; c++) {
      resetCell(state.grid[r][c]);
    }
  }
}

function placeSpannedCell(
  state: GridState,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
): void {
  for (let r = row; r < row + rowSpan && r < state.rows; r++) {
    for (let c = col; c < col + colSpan && c < state.cols; c++) {
      if (r === row && c === col) continue;
      state.grid[r][c].type = "covered";
      state.grid[r][c].originRow = row;
      state.grid[r][c].originCol = col;
    }
  }
}

export type PlaceSkip = {
  skipLokasiId?: number | null;
  skipOriginRow?: number | null;
  skipOriginCol?: number | null;
};

export function canPlaceSpan(
  state: GridState,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
  skip: PlaceSkip = {},
): boolean {
  if (row + rowSpan > state.rows || col + colSpan > state.cols) return false;
  if (row < 0 || col < 0) return false;
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      const cell = state.grid[r][c];
      const t = cell.type;
      if (t === "lokasi" && cell.idLokasi !== skip.skipLokasiId) return false;
      if (t === "covered") {
        if (
          cell.originRow !== skip.skipOriginRow ||
          cell.originCol !== skip.skipOriginCol
        ) {
          return false;
        }
      }
      if (t === "aisle" || t === "label") {
        if (r !== skip.skipOriginRow || c !== skip.skipOriginCol) return false;
      }
    }
  }
  return true;
}

export function canPlaceAisle(
  state: GridState,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
): boolean {
  return canPlaceSpan(state, row, col, rowSpan, colSpan, {
    skipOriginRow: row,
    skipOriginCol: col,
  });
}

export function canPlaceLabel(
  state: GridState,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
): boolean {
  return canPlaceSpan(state, row, col, rowSpan, colSpan, {
    skipOriginRow: row,
    skipOriginCol: col,
  });
}

export type LokasiPlaceSource = {
  idLokasi: number;
  label: string;
  namaJenis: string;
};

export function placeLokasi(
  state: GridState,
  row: number,
  col: number,
  lokasi: LokasiPlaceSource,
  rowSpan = 1,
  colSpan = 1,
): GridState {
  if (!inBounds(state, row, col)) return state;
  const cell = state.grid[row][col];
  if (cell.type === "covered") return state;
  const skip: PlaceSkip = {
    skipOriginRow: row,
    skipOriginCol: col,
    skipLokasiId: cell.type === "lokasi" ? cell.idLokasi : undefined,
  };
  if (!canPlaceSpan(state, row, col, rowSpan, colSpan, skip)) return state;
  clearSpan(state, row, col);
  clearArea(state, row, col, rowSpan, colSpan);
  const origin = state.grid[row][col];
  origin.type = "lokasi";
  origin.idLokasi = lokasi.idLokasi;
  origin.lokasiLabel = lokasi.label;
  origin.lokasiDescription = lokasi.namaJenis;
  origin.rowSpan = rowSpan;
  origin.colSpan = colSpan;
  placeSpannedCell(state, row, col, rowSpan, colSpan);
  return state;
}

export function resizeLokasi(
  state: GridState,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
): GridState {
  if (!inBounds(state, row, col)) return state;
  const cell = state.grid[row][col];
  if (cell.type !== "lokasi") return state;
  const idLokasi = cell.idLokasi;
  const label = cell.lokasiLabel;
  const desc = cell.lokasiDescription;
  const can = canPlaceSpan(state, row, col, rowSpan, colSpan, {
    skipLokasiId: idLokasi,
    skipOriginRow: row,
    skipOriginCol: col,
  });
  if (!can) return state;
  clearSpan(state, row, col);
  clearArea(state, row, col, rowSpan, colSpan);
  const origin = state.grid[row][col];
  origin.type = "lokasi";
  origin.idLokasi = idLokasi;
  origin.lokasiLabel = label;
  origin.lokasiDescription = desc;
  origin.rowSpan = rowSpan;
  origin.colSpan = colSpan;
  placeSpannedCell(state, row, col, rowSpan, colSpan);
  return state;
}

export function placeAisle(
  state: GridState,
  row: number,
  col: number,
  rowSpan = 1,
  colSpan = 1,
): GridState {
  if (!canPlaceAisle(state, row, col, rowSpan, colSpan)) return state;
  clearSpan(state, row, col);
  clearArea(state, row, col, rowSpan, colSpan);
  const origin = state.grid[row][col];
  origin.type = "aisle";
  origin.rowSpan = rowSpan;
  origin.colSpan = colSpan;
  placeSpannedCell(state, row, col, rowSpan, colSpan);
  return state;
}

export function placeLabel(
  state: GridState,
  row: number,
  col: number,
  text: string,
  rowSpan = 1,
  colSpan = 1,
): GridState {
  if (!canPlaceLabel(state, row, col, rowSpan, colSpan)) return state;
  clearSpan(state, row, col);
  clearArea(state, row, col, rowSpan, colSpan);
  const origin = state.grid[row][col];
  origin.type = "label";
  origin.labelText = text;
  origin.rowSpan = rowSpan;
  origin.colSpan = colSpan;
  placeSpannedCell(state, row, col, rowSpan, colSpan);
  return state;
}

export function clearCell(state: GridState, row: number, col: number): GridState {
  if (!inBounds(state, row, col)) return state;
  const cell = state.grid[row][col];
  if (cell.type === "covered" && cell.originRow != null && cell.originCol != null) {
    clearSpan(state, cell.originRow, cell.originCol);
  } else {
    clearSpan(state, row, col);
  }
  return state;
}

export function moveCell(
  state: GridState,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): GridState {
  if (fromRow === toRow && fromCol === toCol) return state;
  if (!inBounds(state, fromRow, fromCol) || !inBounds(state, toRow, toCol)) {
    return state;
  }
  const src = state.grid[fromRow][fromCol];
  if (src.type === "empty" || src.type === "covered") return state;
  const rs = src.rowSpan;
  const cs = src.colSpan;
  if (toRow + rs > state.rows || toCol + cs > state.cols) return state;

  const payload = {
    type: src.type,
    idLokasi: src.idLokasi,
    lokasiLabel: src.lokasiLabel,
    lokasiDescription: src.lokasiDescription,
    labelText: src.labelText,
    rowSpan: rs,
    colSpan: cs,
  };

  clearSpan(state, fromRow, fromCol);
  clearArea(state, toRow, toCol, rs, cs);

  const dest = state.grid[toRow][toCol];
  dest.type = payload.type;
  dest.idLokasi = payload.idLokasi;
  dest.lokasiLabel = payload.lokasiLabel;
  dest.lokasiDescription = payload.lokasiDescription;
  dest.labelText = payload.labelText;
  dest.rowSpan = payload.rowSpan;
  dest.colSpan = payload.colSpan;
  placeSpannedCell(state, toRow, toCol, rs, cs);
  return state;
}

export function resizeRows(state: GridState, rows: number): GridState {
  return { rows, cols: state.cols, grid: buildGrid(rows, state.cols, state.grid) };
}

export function resizeCols(state: GridState, cols: number): GridState {
  return { rows: state.rows, cols, grid: buildGrid(state.rows, cols, state.grid) };
}

export function hasChanges(state: GridState): boolean {
  return state.grid.some((row) =>
    row.some((c) => c.type !== "empty" && c.type !== "covered"),
  );
}

export function assignedLokasiIds(state: GridState): Set<number> {
  const ids = new Set<number>();
  for (const row of state.grid) {
    for (const cell of row) {
      if (cell.type === "lokasi" && cell.idLokasi != null) ids.add(cell.idLokasi);
    }
  }
  return ids;
}

export function serializeCells(state: GridState): LayoutCellPayload[] {
  const cells: LayoutCellPayload[] = [];
  for (const row of state.grid) {
    for (const cell of row) {
      if (cell.type === "empty" || cell.type === "covered") continue;
      cells.push({
        row: cell.row,
        col: cell.col,
        cellType: cell.type,
        idLokasi: cell.type === "lokasi" ? cell.idLokasi : null,
        labelText: cell.type === "label" ? cell.labelText : null,
        rowSpan: cell.rowSpan,
        colSpan: cell.colSpan,
      });
    }
  }
  return cells;
}

export type LokasiLookup = {
  idLokasi: number;
  label: string;
  namaJenis: string;
  jenisList: { namaJenis: string }[];
};

export function applyLayout(
  layout: MappingLayoutData,
  lokasiById: Map<number, LokasiLookup>,
): GridState {
  const rows = layout.rows;
  const cols = layout.cols;
  const state: GridState = { rows, cols, grid: buildGrid(rows, cols) };

  for (const c of layout.cells) {
    const r = c.row;
    const col = c.col;
    if (r < 0 || col < 0 || r >= rows || col >= cols) continue;
    const cell = state.grid[r][col];
    const rs = Math.max(1, c.rowSpan);
    const cs = Math.max(1, c.colSpan);
    const type: CellType =
      c.cellType === "lokasi" || c.cellType === "aisle" || c.cellType === "label"
        ? c.cellType
        : "empty";
    cell.type = type;
    cell.rowSpan = rs;
    cell.colSpan = cs;

    if (type === "lokasi") {
      cell.idLokasi = c.idLokasi;
      const lokasi = c.idLokasi != null ? lokasiById.get(c.idLokasi) : undefined;
      cell.lokasiLabel = lokasi?.label ?? null;
      cell.lokasiDescription = lokasi?.namaJenis ?? null;
    }

    if (type === "label") {
      cell.labelText = c.labelText ?? "";
      if (rs > 1 || cs > 1) placeSpannedCell(state, r, col, rs, cs);
      continue;
    }

    if (rs > 1 || cs > 1) placeSpannedCell(state, r, col, rs, cs);
  }

  return state;
}

export function hasAisleInRange(
  grid: GridCell[][],
  r1: number,
  r2: number,
  c1: number,
  c2: number,
): boolean {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
      const cell = grid[r][c];
      if (cell.type === "aisle") return true;
      if (cell.type === "covered" && cell.originRow != null && cell.originCol != null) {
        const origin = grid[cell.originRow][cell.originCol];
        if (origin.type === "aisle") return true;
      }
    }
  }
  return false;
}
