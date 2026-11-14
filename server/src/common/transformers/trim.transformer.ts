import type { TransformFnParams } from 'class-transformer';

// Removes spaces at the start and end of text: "  Banepa " becomes "Banepa".
// Use it as: @Transform(trim)
export function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
