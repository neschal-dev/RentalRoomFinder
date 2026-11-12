import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { clerk } from '../clerk/clerk.js';

@Injectable()
export class UsersService {
  // Called on every protected request. The first time a Clerk user shows up,
  // we create their row in our own `users` table.
  async findOrCreateByClerkId(clerkId: string) {
    const existing = await db.orm.public.User.where({ clerkId }).first();
    if (existing) {
      return existing;
    }

    try {
      // id, role, phoneVerified, freePostUsed and the dates are filled in automatically.
      return await db.orm.public.User.create({ clerkId });
    } catch (error) {
      // Two requests from a brand-new user can arrive together. The second insert
      // fails on the unique clerkId, so we read the row the first request created.
      const created = await db.orm.public.User.where({ clerkId }).first();
      if (created) {
        return created;
      }
      throw error;
    }
  }

  // Copies "phone verified" from Clerk into our table. Call it right before an action
  // that needs a verified phone, such as the free first post.
  async refreshPhoneVerified(user: {
    id: string;
    clerkId: string;
    phoneVerified: boolean;
  }) {
    if (user.phoneVerified) {
      return true; // already known, no need to ask Clerk
    }

    const clerkUser = await clerk.users.getUser(user.clerkId);
    const verified = clerkUser.phoneNumbers.some(
      (phone) => phone.verification?.status === 'verified',
    );

    if (verified) {
      await db.orm.public.User.where({ id: user.id }).update({
        phoneVerified: true,
      });
    }
    return verified;
  }
}
