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

export function SoSearchIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function SoCloseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function SoCalendarIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function SoHistoryIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function SoBoltIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

export function SoTrashIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function SoAlertIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.4h.01" />
    </svg>
  );
}

export function SoInfoIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6h.01" />
    </svg>
  );
}

export function SoInboxIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M4 13h4l1.5 3h5L16 13h4" />
      <path d="M5.5 5h13l1.5 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z" />
    </svg>
  );
}

export function SoCheckCircleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.4 2.5 2.5 4.7-5.2" />
    </svg>
  );
}

export function SoCircleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  );
}

export function SoHelpIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.8.3-1.4 1-1.4 1.9v.4" />
      <path d="M12 17.3h.01" />
    </svg>
  );
}

export function SoLocationOffIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 21s7-6.2 7-11a7 7 0 0 0-10.5-6" />
      <path d="M5.6 7.6A7 7 0 0 0 5 10c0 4.8 7 11 7 11" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function SoPdfIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h1.5a1.2 1.2 0 0 1 0 2.4H9V13v5" />
      <path d="M13.5 18v-5h1.2a2 2 0 0 1 0 5z" />
    </svg>
  );
}

export function SoLeaderboardIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M4 20v-6" />
      <path d="M10 20V6" />
      <path d="M16 20v-9" />
      <path d="M21 20H3" />
    </svg>
  );
}

export function SoPersonAddIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 11.2-4.5" />
      <path d="M17.5 14v6M14.5 17h6" />
    </svg>
  );
}

export function SoPlayCircleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m10.2 8.4 5.6 3.6-5.6 3.6z" fill="currentColor" />
    </svg>
  );
}

export function SoPauseCircleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" strokeWidth={2.4} />
    </svg>
  );
}

export function SoWarningIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M12 4 2.8 20h18.4z" />
      <path d="M12 10v4" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}

export function SoTrophyIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 5H4.5a2.5 2.5 0 0 0 2.5 4" />
      <path d="M17 5h2.5a2.5 2.5 0 0 1-2.5 4" />
      <path d="M12 14v3" />
      <path d="M8.5 20h7" />
      <path d="M10 17h4v3h-4z" />
    </svg>
  );
}

export function SoChevronDownIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SoPlaylistCheckIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M4 6h11M4 11h11M4 16h6" />
      <path d="m14.5 17.5 2 2 4-4.5" />
    </svg>
  );
}

export function SoPersonOffIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 9.5-5.7" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function SoPlayIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

export function SoFlagIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M5 21V4" />
      <path d="M5 5h12l-2 4 2 4H5" />
    </svg>
  );
}

export function SoArrowRightIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function SoRefreshIcon(props: IconProps) {
  return (
    <svg {...svgProps(props.className, props.style)}>
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
