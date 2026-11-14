import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from '../types/authed-request.type.js';

// Usage in a controller: someMethod(@CurrentUser() user: LocalUser)
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    return context.switchToHttp().getRequest<AuthedRequest>().currentUser;
  },
);
