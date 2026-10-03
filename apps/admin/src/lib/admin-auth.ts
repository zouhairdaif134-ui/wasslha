import { createClient, type Session, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export type AdminAuthState = {
  session: Session | null;
  user: User | null;
  roles: string[];
  loading: boolean;
  error: string | null;
  mfaRequired: boolean;
  mfaFactorId: string | null;
  mfaChallengeId: string | null;
};

export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ session: Session | null; mfaRequired: boolean; factorId: string | null; error: string | null }> {
  if (!supabase) {
    return {
      session: null,
      mfaRequired: false,
      factorId: null,
      error: "Supabase authentication is not configured.",
    };
  }

  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) {
    return {
      session: null,
      mfaRequired: false,
      factorId: null,
      error: result.error?.message ?? "Authentication failed.",
    };
  }

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) {
    return {
      session: result.data.session,
      mfaRequired: false,
      factorId: null,
      error: assurance.error.message,
    };
  }

  if (assurance.data.currentLevel === "aal2") {
    return {
      session: result.data.session,
      mfaRequired: false,
      factorId: null,
      error: null,
    };
  }

  if (assurance.data.nextLevel !== "aal2") {
    return {
      session: result.data.session,
      mfaRequired: false,
      factorId: null,
      error: "Admin account must have an enabled MFA factor.",
    };
  }

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) {
    return {
      session: result.data.session,
      mfaRequired: false,
      factorId: null,
      error: factors.error.message,
    };
  }

  const factor = factors.data.totp.find((item) => item.status === "verified");
  if (!factor) {
    return {
      session: result.data.session,
      mfaRequired: false,
      factorId: null,
      error: "No verified admin MFA factor is available.",
    };
  }

  return {
    session: result.data.session,
    mfaRequired: true,
    factorId: factor.id,
    error: null,
  };
}

export async function verifyAdminMfa(
  factorId: string,
  code: string,
): Promise<{ session: Session | null; error: string | null }> {
  if (!supabase) {
    return { session: null, error: "Supabase authentication is not configured." };
  }

  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) {
    return { session: null, error: challenge.error.message };
  }

  const verification = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });

  if (verification.error) {
    return { session: null, error: verification.error.message };
  }

  const session = (await supabase.auth.getSession()).data.session;
  return { session, error: null };
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  return (await supabase.auth.getSession()).data.session;
}

export async function signOutAdmin(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}
