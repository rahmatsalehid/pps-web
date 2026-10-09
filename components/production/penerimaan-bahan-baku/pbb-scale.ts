// Pembaca timbangan lewat Web Serial API (Chrome/Edge, butuh HTTPS atau
// localhost). Meniru FrmBahanBakuv2: 9600 baud, 8N1, satu pembacaan berakhir
// di karakter LF; spasi, "k", "g" dan CR dibuang dari angka.

type SerialPortLike = {
  open(options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: "none" | "even" | "odd";
  }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
};

type SerialLike = {
  requestPort(): Promise<SerialPortLike>;
};

function getSerial(): SerialLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { serial?: SerialLike }).serial ?? null;
}

export function isWebSerialSupported(): boolean {
  return getSerial() !== null;
}

/** Alasan Web Serial tidak tersedia (null bila tersedia). */
export function webSerialUnsupportedReason(): string | null {
  if (isWebSerialSupported()) return null;
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Halaman ini dibuka lewat HTTP biasa. Web Serial hanya aktif di HTTPS atau localhost.";
  }
  return "Browser ini tidak mendukung Web Serial. Gunakan Chrome atau Edge versi terbaru.";
}

/** Ambil angka dari satu baris timbangan, mis. "  12.50 kg\r" → 12.5. */
export function parseScaleLine(line: string): number | null {
  const cleaned = line.replace(/[\skgKG]/g, "");
  const m = /\d+(?:[.,]\d+)?/.exec(cleaned);
  if (!m) return null;
  const n = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Jeda setelah satu pembacaan diterima (VB menutup port ±3 detik). */
const COOLDOWN_MS = 3000;

export class ScaleConnection {
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private running = false;
  private lastEmit = 0;

  constructor(
    private readonly onReading: (kg: number) => void,
    private readonly onClosed: (error?: string) => void,
  ) {}

  get connected(): boolean {
    return this.port !== null;
  }

  async connect(): Promise<void> {
    const serial = getSerial();
    if (!serial) throw new Error("Browser tidak mendukung Web Serial (gunakan Chrome/Edge)");
    const port = await serial.requestPort();
    try {
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none" });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NetworkError") {
        throw new Error(
          "Port timbangan tidak bisa dibuka. Pastikan port COM yang dipilih benar dan tidak sedang dipakai aplikasi lain (aplikasi VB timbangan, tab/jendela browser lain), lalu cabut-colok kabel USB dan coba lagi.",
        );
      }
      if (name === "InvalidStateError") {
        throw new Error("Port timbangan sudah terbuka. Tutup koneksi sebelumnya lalu coba lagi.");
      }
      throw e;
    }
    this.port = port;
    this.running = true;
    void this.readLoop(port);
  }

  async disconnect(): Promise<void> {
    this.running = false;
    try {
      await this.reader?.cancel();
    } catch {
      /* abaikan */
    }
    try {
      await this.port?.close();
    } catch {
      /* abaikan */
    }
    this.port = null;
    this.reader = null;
  }

  private async readLoop(port: SerialPortLike): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = "";
    let failure: string | undefined;
    try {
      while (this.running && port.readable) {
        this.reader = port.readable.getReader();
        try {
          while (this.running) {
            const { value, done } = await this.reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              const kg = parseScaleLine(line);
              const now = Date.now();
              if (kg !== null && now - this.lastEmit >= COOLDOWN_MS) {
                this.lastEmit = now;
                this.onReading(kg);
              }
            }
            if (buffer.length > 256) buffer = "";
          }
        } finally {
          this.reader.releaseLock();
        }
      }
    } catch (e) {
      failure = e instanceof Error ? e.message : "Koneksi timbangan terputus";
    }
    if (this.port === port) {
      this.running = false;
      try {
        await port.close();
      } catch {
        /* abaikan */
      }
      this.port = null;
      this.reader = null;
      this.onClosed(failure);
    }
  }
}
