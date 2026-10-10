export function openPrintWindow(): Window | null {
  try {
    return window.open("", "_blank");
  } catch {
    return null;
  }
}

export function closePrintWindow(win: Window | null): void {
  if (!win) return;
  try {
    win.close();
  } catch {
    /* abaikan */
  }
}

export function printPdfIntoWindow(
  win: Window | null,
  base64: string,
  title: string,
): boolean {
  if (!win) return false;
  let url: string;
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  } catch {
    return false;
  }
  try {
    win.document.title = title;
    win.addEventListener(
      "load",
      () => {
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch {
            /* user can print from preview */
          }
        }, 250);
      },
      { once: true },
    );
    win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    URL.revokeObjectURL(url);
    try {
      win.close();
    } catch {
      /* abaikan */
    }
    return false;
  }
}

export function printPdfBase64(base64: string, title: string) {
  if (printPdfIntoWindow(openPrintWindow(), base64, title)) return;
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 60_000);
    }
  };
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  void title;
}
