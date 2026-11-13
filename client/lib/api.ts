import axios from 'axios';

// Address of our NestJS server.
const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// Clerk's getToken() gives a fresh session token, or null when nobody is logged in.
export type GetToken = () => Promise<string | null>;

// Builds an axios client that puts the Clerk token on every request as
// "Authorization: Bearer <token>". The NestJS server checks this token.
// Use it inside a client component: const { getToken } = useAuth(); const api = createApi(getToken);
export function createApi(getToken: GetToken) {
  const api = axios.create({ baseURL });

  // Runs before every request leaves the browser.
  api.interceptors.request.use(async (config) => {
    // Ask Clerk for the token each time. Tokens are short-lived, so we never store one.
    const token = await getToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  return api;
}

// The shape of GET /me on the server.
export type MeResponse = {
  id: string;
  role: 'user' | 'admin';
  phoneVerified: boolean;
  freePostUsed: boolean;
};
