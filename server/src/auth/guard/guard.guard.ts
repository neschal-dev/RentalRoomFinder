import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getAuth } from '@clerk/express';
import { UsersService } from '../../users/users.service.js';
import type { AuthedRequest } from '../types/authed-request.type.js';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();

    // clerkMiddleware (set up in main.ts) already checked the token.
    // userId is null when there is no token or the token is invalid or expired.
    const { userId } = getAuth(request);
    if (!userId) {
      throw new UnauthorizedException('Please sign in');
    }

    // Turn the Clerk id into our own user row and attach it to the request,
    // so controllers can use it with @CurrentUser().
    request.currentUser = await this.users.findOrCreateByClerkId(userId);
    return true;
  }
}
