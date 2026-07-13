import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';

const base =
  'w-full rounded-lg border border-ligne bg-surface-2 px-3 py-2 text-sm text-texte placeholder:text-desactive-texte ' +
  'focus:border-primaire focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primaire/20 transition-colors ' +
  'disabled:bg-desactive-fond disabled:text-desactive-texte';

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-texte">
          {label}
          {required && <span className="ml-0.5 text-alerte">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-alerte">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-texte-2">{hint}</span>
      )}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(base, className)} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(base, 'min-h-[80px] resize-y', className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(base, 'appearance-none pr-8', className)} {...rest}>
        {children}
      </select>
    );
  },
);
