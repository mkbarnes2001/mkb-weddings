import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, KeyRound, LoaderCircle, LogOut, Mail, RefreshCw } from "lucide-react";
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
  accessMode: "none",
  supportGrantId: "",
  supportScope: "",
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
    <div
      className="grid min-h-screen place-items-center bg-[#f5f3ef] px-5 py-10 text-neutral-950"
      style={{ fontFamily: '"Montserrat", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif' }}
    >
      <section className="w-full max-w-lg rounded-3xl bg-white px-7 py-9 text-center shadow-xl ring-1 ring-black/[0.06] sm:px-10 sm:py-11">
        <div
          className="mx-auto inline-flex items-baseline text-[28px] leading-none tracking-[-0.055em]"
          aria-label="WedPlanned"
        >
          <span
            style={{
              marginRight: "-.035em",
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "1.12em",
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            Wed
          </span>
          <span className="font-bold">
            Planned
          </span>
        </div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Professional access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">WedPlanned Pro sign in</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-neutral-600">Enter the email attached to your business membership. We will send a private one-time sign-in link.</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Email address</span>
            <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-black/10 bg-[#faf9f7] px-3.5 text-left focus-within:border-black/30 focus-within:ring-2 focus-within:ring-black/5">
              <Mail size={16} className="text-neutral-400" />
              <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
          </label>
          <button disabled={busy || !email.trim()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white disabled:opacity-40">
            {busy ? <LoaderCircle size={15} className="animate-spin" /> : <KeyRound size={15} />}
            {busy ? "Sending…" : "Send secure sign-in link"}
          </button>
        </form>

        {message ? <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-center text-xs leading-5 text-emerald-800">{message}</div> : null}
        {error ? <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-center text-xs leading-5 text-red-800">{error}</div> : null}
        {debugUrl ? (
          <a href={debugUrl} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold underline underline-offset-4">
            Open development sign-in link <ArrowRight size={13} />
          </a>
        ) : null}

        <button onClick={onSignedIn} className="mx-auto mt-7 inline-flex items-center gap-2 text-[11px] font-medium text-neutral-500 hover:text-black">
          <RefreshCw size={13} /> I have used the link — refresh session
        </button>
      </section>
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
      window.location.assign("/admin/business");
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
