import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

// A pipe checks (and can change) a value before it reaches the controller method.
// This one checks a request body, query string or URL parameter against a zod schema.
//
// Usage: @Body(new ZodValidationPipe(createListingSchema)) body: CreateListingInput
export class ZodValidationPipe<Output> implements PipeTransform<
  unknown,
  Output
> {
  constructor(private readonly schema: ZodType<Output>) {}

  transform(value: unknown): Output {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      // Answer 400 with a readable list of what is wrong, e.g.
      // [{ field: "rentPrice", message: "Too small: expected number to be >=500" }]
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // The parsed value: unknown keys removed, text trimmed, query strings turned into numbers.
    return result.data;
  }
}
