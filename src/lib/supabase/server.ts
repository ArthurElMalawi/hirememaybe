import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Read-only client for Server Components (avoid writing cookies to comply with Next.js constraints)
export const createClientServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        // No-ops for write operations to prevent errors outside Server Actions/Route Handlers
        set: (name: string, value: string, options: CookieOptions) => { void name; void value; void options; },
        remove: (name: string, options: CookieOptions) => { void name; void options; },
      }
    }
  );
};

// Write-enabled client for Server Actions and Route Handlers (allowed to modify cookies)
export const createClientAction = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          cookieStore.set({ name, value, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          // Prefer delete for removal in Route Handlers / Server Actions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cookieStore as any).delete?.(name);
          void options;
        },
      }
    }
  );
};
