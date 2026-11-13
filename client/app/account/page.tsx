'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createApi, type MeResponse } from '@/lib/api';

// Test page: logs in with Clerk, then asks our NestJS server "who am I?" (GET /me).
// If the card below shows your role, the whole login chain works:
// Clerk -> token -> NestJS guard -> users table.
export default function AccountPage() {
  // isLoaded: Clerk finished starting. getToken: gives the session token.
  const { isLoaded, getToken } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return; // wait until Clerk is ready

    createApi(getToken)
      .get<MeResponse>('/me')
      .then((response) => setMe(response.data))
      .catch(() => setError('Could not reach the server, or the login was rejected.'));
  }, [isLoaded, getToken]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">My account</h1>

      {error && <p className="text-red-600">{error}</p>}
      {!me && !error && <p>Loading…</p>}

      {me && (
        <dl className="space-y-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <div>
            <dt className="text-sm text-zinc-500">User id</dt>
            <dd className="break-all font-mono text-sm">{me.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Role</dt>
            <dd>{me.role}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Phone verified</dt>
            <dd>{me.phoneVerified ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Free post used</dt>
            <dd>{me.freePostUsed ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      )}
    </main>
  );
}
