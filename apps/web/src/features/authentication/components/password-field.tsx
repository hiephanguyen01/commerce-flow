'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';

type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  showLabel: string;
  hideLabel: string;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ id, label, error, showLabel, hideLabel, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    const errorId = error ? `${id}-error` : undefined;

    return (
      <div>
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>

        <div className="relative">
          <input
            {...props}
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={errorId}
            className={[
              'block h-11 w-full rounded-xl border bg-white px-3.5 pr-20 text-sm text-slate-950 outline-none transition',
              'placeholder:text-slate-400',
              'focus:ring-4',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
            ].join(' ')}
          />

          <button
            type="button"
            onClick={() => {
              setVisible((current) => !current);
            }}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 hover:text-slate-900"
            aria-label={visible ? hideLabel : showLabel}
          >
            {visible ? hideLabel : showLabel}
          </button>
        </div>

        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
