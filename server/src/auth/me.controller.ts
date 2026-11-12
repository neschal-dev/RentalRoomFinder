import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard , type LocalUser} from './guard/guard.guard.js';
import { CurrentUser } from './decorator/current-user.decorator.js';


@Controller('me')
export class MeController {
  // Only logged-in users get past the guard. Everyone else receives 401.
  @Get()
  @UseGuards(ClerkAuthGuard)
  me(@CurrentUser() user: LocalUser) {
    return {
      id: user.id,
      role: user.role,
      phoneVerified: user.phoneVerified,
      freePostUsed: user.freePostUsed,
    };
  }
}