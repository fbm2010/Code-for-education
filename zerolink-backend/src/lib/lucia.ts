import { Lucia, TimeSpan } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { config } from '../config.js';

// @ts-expect-error: drizzle-orm 0.30.x / @lucia-auth/adapter-drizzle 1.1.0 version mismatch
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter as ConstructorParameters<typeof Lucia>[0], {
  sessionCookie: {
    name: 'zerolink_session',
    attributes: {
      secure:   config.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
    },
  },
  sessionExpiresIn: new TimeSpan(config.SESSION_TTL_DAYS, 'd'),
  getUserAttributes(attrs) {
    return {
      email:       attrs.email,
      username:    attrs.username,
      displayName: attrs.display_name,
      isGuest:     attrs.is_guest,
      role:        attrs.role,
    };
  },
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email:        string | null;
      username:     string | null;
      display_name: string | null;
      is_guest:     boolean;
      role:         string;
    };
  }
}
