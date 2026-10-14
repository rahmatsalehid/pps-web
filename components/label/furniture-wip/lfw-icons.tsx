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

export function LfwSearchIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function LfwCopyIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function LfwCheckIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function LfwPrintIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </svg>
  );
}

export function LfwEditIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function LfwTrashIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function LfwEllipsisIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LfwChairIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
      <path d="M4 10h16v4H4z" />
      <path d="M6 14v4M18 14v4M6 18h12" />
    </svg>
  );
}

export function LfwHistoryIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function LfwCheckSquareIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export function LfwSquareIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}

export function LfwInfoIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function LfwLayersIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </svg>
  );
}
