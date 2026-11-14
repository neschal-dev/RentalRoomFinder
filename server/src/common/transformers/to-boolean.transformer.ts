import type { TransformFnParams } from 'class-transformer';

// Query strings are always text. This turns "true" and "false" into real booleans.
// Anything else is left alone, so the @IsBoolean() check can reject it.
// Use it as: @Transform(toBoolean)
export function toBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}
