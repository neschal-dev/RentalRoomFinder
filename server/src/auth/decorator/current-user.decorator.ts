import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthedRequest } from '../guard/guard.guard.js';

// Usage in a controller: someMethod(@CurrentUser() user: LocalUser)
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<AuthedRequest>().currentUser;
});