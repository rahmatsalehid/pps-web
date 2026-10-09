import { useCallback, useEffect, useRef } from "react";

export type DisplaySak = {
  noSak: number;
  jam: string;
  berat: number;
  kondisi: string;
};

export type DisplayState = {
  supplier: string;
  noPenerimaan: string;
  palletKe: number;
  jmlhPallet: number;
  jmlhSak: number;
  jmlhKg: number;
  saks: DisplaySak[];
  weight: number | null;
  connected: boolean;
  active: boolean;
};

export type DisplayMsg =
  | { type: "state"; state: DisplayState }
  | { type: "close" }
  | { type: "hello" };

const CHANNEL = "pps-pbb-scale-display";
const WINDOW_NAME = "pps-pbb-scale-display";
const DISPLAY_PATH = "/display-timbangan";
const DISPLAY_WIDTH = 1010;
const DISPLAY_HEIGHT = 730;

let sharedChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
    return null;
  if (!sharedChannel) sharedChannel = new BroadcastChannel(CHANNEL);
  return sharedChannel;
}

function postDisplayMsg(msg: DisplayMsg): void {
  getChannel()?.postMessage(msg);
}

type ExtendedScreen = Screen & {
  availLeft?: number;
  availTop?: number;
  isExtended?: boolean;
};

function displayBounds(): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const s = window.screen as ExtendedScreen;
  const availLeft = s.availLeft ?? 0;
  const availTop = s.availTop ?? 0;
  const width = Math.min(DISPLAY_WIDTH, s.availWidth);
  const height = Math.min(DISPLAY_HEIGHT, s.availHeight);
  if (s.isExtended === false) {
    return {
      left: availLeft + Math.max(Math.round((s.availWidth - width) / 2), 0),
      top: availTop + Math.max(Math.round((s.availHeight - height) / 2), 0),
      width,
      height,
    };
  }
  return { left: availLeft + s.availWidth, top: availTop, width, height };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function repositionToExternal(win: Window | null): Promise<boolean> {
  if (!win) return false;
  try {
    const w = window as unknown as {
      getScreenDetails?: () => Promise<{
        screens: {
          isPrimary: boolean;
          left: number;
          top: number;
          width: number;
          height: number;
        }[];
      }>;
    };
    if (!w.getScreenDetails) return false;
    const perm = await navigator.permissions.query({
      name: "window-placement" as PermissionName,
    });
    if (perm.state === "denied") return false;
    const details = await w.getScreenDetails();
    if (win.closed) return false;
    const wx = win.screenX;
    const wy = win.screenY;
    const target =
      details.screens.find(
        (sc) =>
          wx < sc.left || wx >= sc.left + sc.width || wy < sc.top || wy >= sc.top + sc.height,
      ) ?? details.screens.find((sc) => !sc.isPrimary);
    if (!target) return false;
    win.moveTo(target.left, target.top);
    win.resizeTo(target.width, target.height);
    return true;
  } catch {
    /* abaikan */
  }
  return false;
}

async function placeOnExtendedScreen(win: Window | null): Promise<void> {
  if (!win) return;
  try {
    if (await repositionToExternal(win)) return;
    const s = window.screen as ExtendedScreen;
    if (s.isExtended === false || win.closed) return;
    const availLeft = s.availLeft ?? 0;
    const availTop = s.availTop ?? 0;
    const rightLeft = availLeft + s.availWidth;
    await delay(120);
    if (win.closed) return;
    if (Math.abs(win.screenX - rightLeft) <= 24) return;
    const leftTarget = availLeft - win.outerWidth;
    win.moveTo(leftTarget, availTop);
    await delay(140);
    if (win.closed) return;
    if (Math.abs(win.screenX - leftTarget) <= 24) return;
    win.moveTo(rightLeft, availTop);
  } catch {
    /* abaikan */
  }
}

export function openScaleDisplay(): Window | null {
  if (typeof window === "undefined") return null;
  const b = displayBounds();
  const features = [
    "popup=yes",
    `width=${b.width}`,
    `height=${b.height}`,
    `left=${b.left}`,
    `top=${b.top}`,
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
    "scrollbars=no",
    "resizable=yes",
  ].join(",");
  const win = window.open(DISPLAY_PATH, WINDOW_NAME, features);
  void placeOnExtendedScreen(win);
  return win;
}

export function closeScaleDisplay(win: Window | null): void {
  postDisplayMsg({ type: "close" });
  try {
    win?.close();
  } catch {
    /* abaikan */
  }
}

export function postDisplayState(state: DisplayState): void {
  postDisplayMsg({ type: "state", state });
}

export function connectDisplayView(handlers: {
  onState: (state: DisplayState) => void;
  onClose: () => void;
}): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (e: MessageEvent<DisplayMsg>) => {
    const msg = e.data;
    if (!msg) return;
    if (msg.type === "state") handlers.onState(msg.state);
    else if (msg.type === "close") handlers.onClose();
  };
  ch.addEventListener("message", listener);
  ch.postMessage({ type: "hello" });
  return () => ch.removeEventListener("message", listener);
}

export function nowClock(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function useScaleDisplay(state: DisplayState): {
  openDisplay: () => void;
  closeDisplay: () => void;
} {
  const winRef = useRef<Window | null>(null);
  const stateRef = useRef(state);

  const openDisplay = useCallback(() => {
    winRef.current = openScaleDisplay();
  }, []);

  const closeDisplay = useCallback(() => {
    closeScaleDisplay(winRef.current);
    winRef.current = null;
  }, []);

  useEffect(() => {
    stateRef.current = state;
    const win = winRef.current;
    if (win && !win.closed) postDisplayState(state);
  }, [state]);

  useEffect(() => {
    const ch = getChannel();
    if (!ch) return;
    const listener = (e: MessageEvent<DisplayMsg>) => {
      if (e.data && e.data.type === "hello") postDisplayState(stateRef.current);
    };
    ch.addEventListener("message", listener);
    return () => {
      ch.removeEventListener("message", listener);
      closeScaleDisplay(winRef.current);
      winRef.current = null;
    };
  }, []);

  return { openDisplay, closeDisplay };
}
