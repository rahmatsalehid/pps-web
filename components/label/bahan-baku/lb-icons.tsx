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

export function LbSearchIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function LbPrintIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </svg>
  );
}

export function LbCopyIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function LbCheckIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function LbScienceIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M10 2v7.31L4.4 18.6A2 2 0 0 0 6.1 21.5h11.8a2 2 0 0 0 1.7-2.9L14 9.31V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16h10" />
    </svg>
  );
}

export function LbGridIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function LbInventoryIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export function LbScaleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 4v16M7 20h10M12 6 5 18h14L12 6Z" />
      <path d="M5 18a3 3 0 0 0 6 0M13 18a3 3 0 0 0 6 0" />
    </svg>
  );
}

export function LbSplitIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M6 21V9a5 5 0 0 1 5-5h7" />
      <path d="m15 1 4 3-4 3" />
    </svg>
  );
}

export function LbDropIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 2.7s6 6.4 6 10.8a6 6 0 1 1-12 0c0-4.4 6-10.8 6-10.8Z" />
    </svg>
  );
}

export function LbBlockIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </svg>
  );
}

export function LbChevronRightIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function LbCheckSquareIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export function LbSquareIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}
