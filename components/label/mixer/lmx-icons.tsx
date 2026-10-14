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

export function LmxSearchIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function LmxPlusIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function LmxCopyIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function LmxCheckIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function LmxPrintIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </svg>
  );
}

export function LmxEditIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function LmxTrashIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function LmxEllipsisIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LmxWeightIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 4v16M7 20h10M12 6 5 18h14L12 6Z" />
      <path d="M5 18a3 3 0 0 0 6 0M13 18a3 3 0 0 0 6 0" />
    </svg>
  );
}

export function LmxCheckSquareIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export function LmxSquareIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}

export function LmxScienceIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M8.5 14h7" />
    </svg>
  );
}

export function LmxPdfIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 17v-3M12 17v-5M16 17v-2" />
    </svg>
  );
}

export function LmxHistoryIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function LmxLockIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function LmxGearIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}
