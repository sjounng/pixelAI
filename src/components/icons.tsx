import type { SVGProps } from "react";

/**
 * 프로젝트 공용 아이콘 세트.
 * 픽셀/레트로 톤에 맞춘 굵은(2px) currentColor 라인 + square cap.
 * 텍스트와 인라인 정렬되도록 기본 1em 크기 + baseline 보정.
 */
function Svg({ className = "", children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={`inline-block h-[1em] w-[1em] align-[-0.125em] ${className}`}
      {...rest}
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export function IconPublic({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c3.5 3 3.5 15 0 18M12 3c-3.5 3-3.5 15 0 18" />
    </Svg>
  );
}

export function IconPrivate({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="10" width="14" height="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

export function IconEdit({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 20h4L18 10l-4-4L4 16z" />
      <path d="M14 6l4 4" />
    </Svg>
  );
}

export function IconRegenerate({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" />
      <path d="M20 3v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" />
      <path d="M4 21v-5h5" />
    </Svg>
  );
}

export function IconDelete({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </Svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4v10" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </Svg>
  );
}

export function IconCopy({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="8" y="8" width="12" height="12" />
      <path d="M16 8V4H4v12h4" />
    </Svg>
  );
}

export function IconSave({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v6h7V4" />
      <rect x="8" y="13" width="8" height="6" />
    </Svg>
  );
}

export function IconGenerate({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
    </Svg>
  );
}

export function IconCharge({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 4h12l3 5-9 11L3 9z" />
      <path d="M3 9h18" />
      <path d="M9 4l3 16 3-16" />
    </Svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </Svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12l5 5 9-11" />
    </Svg>
  );
}

export function IconPen({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15 4l5 5-9 9-5 1 1-5z" />
      <path d="M13 6l5 5" />
    </Svg>
  );
}

export function IconEraser({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 15l7-7 7 7-5 5H9z" />
      <path d="M11 8l7 7" />
      <path d="M9 20h11" />
    </Svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </Svg>
  );
}
