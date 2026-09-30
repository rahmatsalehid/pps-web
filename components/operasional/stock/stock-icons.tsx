import type { CSSProperties } from "react";

type IconProps = { className?: string; style?: CSSProperties };

function svgProps(className?: string, style?: CSSProperties) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
    "aria-hidden": true,
  };
}

export function StockLaundryIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="14" r="4" />
      <path d="M7.5 6.5h.01M10.5 6.5h.01" />
    </svg>
  );
}

export function StockRecycleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2" />
      <path d="M17.4 3.4v3.6h-3.6" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2" />
      <path d="M6.6 20.6V17h3.6" />
    </svg>
  );
}

export function StockGrainIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <ellipse cx="8.5" cy="9" rx="3" ry="5.5" transform="rotate(-35 8.5 9)" />
      <ellipse cx="15.5" cy="9" rx="3" ry="5.5" transform="rotate(35 15.5 9)" />
      <path d="M12 21v-7" />
    </svg>
  );
}

export function StockScatterIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="7" cy="7" r="1.6" />
      <circle cx="15.5" cy="6" r="1.6" />
      <circle cx="11" cy="12.5" r="1.6" />
      <circle cx="17.5" cy="14" r="1.6" />
      <circle cx="6.5" cy="17" r="1.6" />
    </svg>
  );
}

export function StockSettingsIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function StockBlenderIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="6.5" y="2.5" width="11" height="4" rx="1" />
      <path d="M8 6.5h8l-1 5.5a4 4 0 0 1-2.3 2.6V21h-1.4v-6.4A4 4 0 0 1 9 12z" />
      <path d="M9.5 11h5" />
    </svg>
  );
}

export function StockChairIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M6 4v7" />
      <path d="M18 4v7" />
      <path d="M6 11h12" />
      <path d="M5 14h14" />
      <path d="M7 14v6" />
      <path d="M17 14v6" />
    </svg>
  );
}

export function StockInventoryIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M3 7.5 12 3l9 4.5" />
      <path d="M3 7.5V17l9 4.5V12" />
      <path d="M21 7.5V17l-9 4.5" />
      <path d="M7.5 5.2 16.5 9.8" />
    </svg>
  );
}

export function StockReportIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M12 8.5v4.5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function StockBoxIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3z" />
      <path d="M3 7.5V17l9 4.5V12" />
      <path d="M21 7.5V17l-9 4.5" />
    </svg>
  );
}

export function StockRefreshIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export function StockCloseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function StockLabelIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12.6 2.6 21.4 11.4a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2c.5 0 1 .2 1.4.6z" />
      <circle cx="7.2" cy="7.2" r="1.2" />
    </svg>
  );
}

export function StockScaleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 3v18" />
      <path d="M5 7h14" />
      <path d="M6 7 3 14h6L6 7z" />
      <path d="M18 7l-3 7h6l-3-7z" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

export function StockCopyIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function StockInboxIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 2.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-9.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.75 1.1z" />
    </svg>
  );
}

export function StockAlertIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function StockErrorIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}
