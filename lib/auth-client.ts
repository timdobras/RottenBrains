import { createAuthClient } from 'better-auth/react';

// baseURL defaults to the current origin in the browser.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
