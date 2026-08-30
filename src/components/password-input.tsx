"use client";

import { useState } from "react";

// A password <input> with a show/hide toggle — used everywhere someone
// types a password (login, register, choosing a new one after a reset
// link) so the behavior and icon are consistent across all three instead
// of three separate ad-hoc implementations.
//
// `inputClassName` carries the caller's existing input styling (the two
// forms that existed before this component used two different conventions
// — an inline Tailwind string in login/page.tsx, the shared `.input` class
// in register/page.tsx — so this stays agnostic and just appends the extra
// right-padding the toggle button needs). `className` goes on the wrapping
// div, for margin/spacing that used to live directly on the <input>.
export function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoFocus,
  className = "",
  inputClassName,
  // When set, the field gets the same red-border treatment as every other
  // required-and-empty field in the app — see the `.input-error` styles in
  // globals.css. Callers using the shared `.input` class can just pass
  // `error` and get it for free; callers on raw Tailwind borders (login,
  // forgot/reset-password) also work since `.input-error` uses !important.
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
  className?: string;
  inputClassName: string;
  error?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`${inputClassName} pr-11${error ? " input-error" : ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink-dim"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.27 21.27 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a21.27 21.27 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
