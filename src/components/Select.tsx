"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconCheck } from "@/components/icons";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
}

/** 기본 브라우저 select 대신 쓰는 픽셀 톤 커스텀 드롭다운. */
export default function Select({ value, onChange, options, className = "", placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = options.find((o) => o.value === value)?.label ?? placeholder ?? "";

  return (
    <div
      ref={ref}
      className={"relative " + className}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-1 rounded-md border-2 border-ink bg-paper px-2 py-1 text-[11px] text-ink shadow-pixel"
      >
        <span className="truncate">{current}</span>
        <IconChevronDown className="shrink-0 text-gray-500" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border-2 border-ink bg-paper text-[11px] shadow-pixel"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={
                    "flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left hover:bg-ink/5 " +
                    (selected ? "bg-amber-100 font-semibold" : "")
                  }
                >
                  <span className="truncate">{o.label}</span>
                  {selected && <IconCheck className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
