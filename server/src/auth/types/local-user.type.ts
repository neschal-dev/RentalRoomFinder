import type { UsersService } from '../../users/users.service.js';

// The user row from our own database (the `users` table).
export type LocalUser = Awaited<
  ReturnType<UsersService['findOrCreateByClerkId']>
>;
