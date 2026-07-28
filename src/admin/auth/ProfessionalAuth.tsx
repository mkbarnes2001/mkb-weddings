import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Building2, KeyRound, LoaderCircle, LogOut, Mail, RefreshCw } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { ProfessionalAuthState } from "../types/platform";

type ProfessionalAuthContextValue = {
  auth: ProfessionalAuthState;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
};

const emptyAuth: ProfessionalAuthState = {
  accessGranted: false,
  authenticated: false,
  enforced: true,
  mode: "none",
  userId: "",
  email: "",
  displayName: "",
  platformRole: "member",
  membershipId: "",
  workspaceId: "",
  workspaceSlug: "",
  businessName: "",
  marketplaceSlug: "",
  role: "",
  permissions: [],
  memberships: [],
};

const ProfessionalAuthContext = createContext<ProfessionalAuthContextValue | null>(null);

function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f3ef] px-5 text-neutral-950">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.06]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        <span className="text-xs font-medium">Opening WedPlanned…</span>
      </div>
    </div>
  );
}

function AuthError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f3ef] px-5 text-neutral-950">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/[0.08]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">WedPlanned</p>
        <h1 className="mt-3 text-xl font-semibold">Admin unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{message}</p>
        <button onClick={retry} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white">
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    </div>
  );
}

function ProfessionalSignIn({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [debugUrl, setDebugUrl] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setDebugUrl("");
    try {
      const result = await AdminApiService.requestProfessionalSignIn(email, `${window.location.pathname}${window.location.search}`);
      setMessage(result.message);
      setDebugUrl(result.debugUrl || "");
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to request a secure sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] px-5 py-10 text-neutral-950 sm:grid sm:place-items-center">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-xl ring-1 ring-black/[0.06] lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
        <section className="relative hidden min-h-[620px] overflow-hidden bg-[#111] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,.15), transparent 35%), radial-gradient(circle at 80% 70%, rgba(171,132,76,.35), transparent 38%)" }} />
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black"><Building2 size={20} /></div>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">WedPlanned Pro</p>
            <h1 className="mt-3 max-w-md text-4xl font-semibold leading-tight">Run your wedding business in one connected workspace.</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/62">Secure access for businesses, teams, bookings, client work and future marketplace tools.</p>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-xs leading-6 text-white/65">
            Passwordless links are single-use, expire quickly and resolve your business membership on the server.
          </div>
        </section>

        <section className="flex min-h-[560px] flex-col justify-center p-7 sm:p-10 lg:p-12">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2eee7] text-black lg:hidden"><Building2 size={20} /></div>
          <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 lg:mt-0">Professional sign-in</p>
          <h2 className="mt-3 text-2xl font-semibold">Open your WedPlanned workspace</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">Enter the email attached to your business membership. We will send a private one-time sign-in link.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Email address</span>
              <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-black/10 bg-[#faf9f7] px-3.5 focus-within:border-black/30 focus-within:ring-2 focus-within:ring-black/5">
                <Mail size={16} className="text-neutral-400" />
                <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
            </label>
            <button disabled={busy || !email.trim()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white disabled:opacity-40">
              {busy ? <LoaderCircle size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {busy ? "Sending…" : "Send secure sign-in link"}
            </button>
          </form>

          {message ? <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">{message}</div> : null}
          {error ? <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-800">{error}</div> : null}
          {debugUrl ? (
            <a href={debugUrl} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold underline underline-offset-4">
              Open development sign-in link <ArrowRight size={13} />
            </a>
          ) : null}

          <button onClick={onSignedIn} className="mt-8 inline-flex items-center gap-2 self-start text-[11px] font-medium text-neutral-500 hover:text-black">
            <RefreshCw size={13} /> I have used the link — refresh session
          </button>
        </section>
      </div>
    </div>
  );
}

export function ProfessionalAuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<ProfessionalAuthState>(emptyAuth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const next = await AdminApiService.getProfessionalSession();
      setAuth(next);
    } catch (refreshError: any) {
      setError(refreshError?.message || "Unable to resolve the WedPlanned session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function signOut() {
    await AdminApiService.signOutProfessional();
    setAuth(emptyAuth);
    await refresh();
  }

  async function switchWorkspace(workspaceId: string) {
    setLoading(true);
    try {
      const next = await AdminApiService.switchProfessionalWorkspace(workspaceId);
      setAuth(next);
      window.location.assign("/admin/wedplanned");
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo<ProfessionalAuthContextValue>(() => ({ auth, refresh, signOut, switchWorkspace }), [auth]);

  if (loading) return <AuthLoading />;
  if (error) return <AuthError message={error} retry={() => { setLoading(true); void refresh(); }} />;
  if (!auth.accessGranted) return <ProfessionalSignIn onSignedIn={refresh} />;

  return <ProfessionalAuthContext.Provider value={value}>{children}</ProfessionalAuthContext.Provider>;
}

export function useProfessionalAuth() {
  const value = useContext(ProfessionalAuthContext);
  if (!value) throw new Error("useProfessionalAuth must be used inside ProfessionalAuthProvider.");
  return value;
}

export function ProfessionalSessionActions() {
  const { auth, signOut } = useProfessionalAuth();
  if (!auth.authenticated) return null;
  return (
    <button onClick={() => void signOut()} className="inline-flex items-center gap-2 text-[10px] text-white/55 hover:text-white">
      <LogOut size={12} /> Sign out
    </button>
  );
}
