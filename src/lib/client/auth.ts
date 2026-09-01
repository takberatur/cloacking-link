import { createAuthClient } from 'better-auth/svelte';
import { adminClient } from 'better-auth/client/plugins';
import { emailOTPClient } from "better-auth/client/plugins"
import { twoFactorClient } from "better-auth/client/plugins"
import { usernameClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    emailOTPClient(),
    usernameClient(),
    twoFactorClient({
      onTwoFactorRedirect({ twoFactorMethods }) {
        window.location.href = "/2fa"
      }
    })
  ]
});

export const { signIn, signUp, signOut, useSession } = authClient;
