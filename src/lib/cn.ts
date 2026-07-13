import clsx, { type ClassValue } from 'clsx';

/** Fusion de classes conditionnelles. */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
