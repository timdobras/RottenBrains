import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { prisma } from './prisma';

/**
 * Better Auth server instance.
 *
 * Replaces Supabase Auth. The `user` model is mapped onto the existing
 * `users` table (single source of truth — id == the original Supabase UUID),
 * so every app foreign key keeps working unchanged. `account`/`session`/
 * `verification` are fresh Better-Auth-owned tables.
 *
 * Passwords migrated from Supabase are bcrypt (`$2a$`); we verify them with
 * bcryptjs and hash new ones the same way, so all 155 email/password users
 * keep their credentials.
 */

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const discordEnabled = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // All Better-Auth-generated ids are UUIDs so they fit the uuid columns and
  // FK back to users.id (also uuid).
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: async (password) => bcrypt.hash(password, 10),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },

  socialProviders: {
    ...(googleEnabled
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            prompt: 'select_account',
          },
        }
      : {}),
    ...(discordEnabled
      ? {
          discord: {
            clientId: process.env.DISCORD_CLIENT_ID as string,
            clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
          },
        }
      : {}),
  },

  // Link a social login to an existing account with the same (verified) email,
  // so the 190 Google / 12 Discord users match their backfilled rows.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'discord'],
    },
  },

  // Cache the session in a signed cookie so middleware can read it without a DB
  // round-trip (keeps the edge middleware fast, like the old premium cookie).
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  // Map Better Auth's user model onto the existing `users` table + columns.
  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'email_verified',
      image: 'image_url',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    additionalFields: {
      username: { type: 'string', required: false, input: false },
      premium: { type: 'boolean', required: false, input: false, defaultValue: false },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Replicate the old `handle_new_user` trigger: default username to the
        // email. The `add_genre_stats_after_user_creation` trigger on `users`
        // still seeds genre stats on insert.
        before: async (user) => {
          return {
            data: {
              ...user,
              username: (user as { username?: string }).username || user.email,
            },
          };
        },
      },
    },
  },
});
