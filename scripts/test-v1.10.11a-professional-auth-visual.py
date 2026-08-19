from pathlib import Path

tsx = Path(
    "src/admin/auth/ProfessionalAuth.tsx"
).read_text(
    encoding="utf-8",
)

css = Path(
    "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)

start = tsx.index(
    "function ProfessionalSignIn"
)

end = tsx.index(
    "export function ProfessionalAuthProvider",
    start,
)

signin = tsx[start:end]

# Presentation contract.
for token in [
    'className="professional-auth-page"',
    'className="professional-auth-card"',
    'className="professional-auth-brand"',
    'className="professional-auth-eyebrow"',
    'className="professional-auth-title"',
    "Sign in to your workspace.",
    'className="professional-auth-form"',
    'className="professional-auth-input-shell"',
    'className="professional-auth-primary"',
    'className="professional-auth-refresh"',
]:
    assert token in signin, token

# Authentication behaviour must remain unchanged.
for token in [
    "AdminApiService.requestProfessionalSignIn(",
    "email,",
    "window.location.pathname",
    "window.location.search",
    "setMessage(result.message)",
    "setDebugUrl(result.debugUrl || \"\")",
    "onSubmit={submit}",
    'type="email"',
    "required",
    'autoComplete="email"',
    "disabled={busy || !email.trim()}",
    "onClick={onSignedIn}",
]:
    assert token in signin, token

# Dedicated CSS must carry the layout rather than
# depending on potentially ungenerated Tailwind utilities.
for selector in [
    ".professional-auth-page",
    ".professional-auth-card",
    ".professional-auth-brand",
    ".professional-auth-title",
    ".professional-auth-input-shell",
    ".professional-auth-primary",
    ".professional-auth-refresh-boundary",
]:
    assert selector in css, selector

for design_token in [
    "background: #f5f3ef;",
    "width: min(100%, 520px);",
    "border: 1px solid #d8d4cd;",
    "border-radius: 18px;",
    "0 22px 60px rgba(17, 17, 17, .06)",
    "font-size: clamp(36px, 5vw, 55px);",
]:
    assert design_token in css, design_token

assert (
    'className="grid min-h-screen '
    'place-items-center bg-[#f5f3ef]'
    not in signin
)

print(
    "PASS v1.10.11a professional auth visual alignment"
)
print(
    "  WedPlanned access-card language: verified"
)
print(
    "  dedicated admin auth CSS: verified"
)
print(
    "  secure-link request flow: preserved"
)
print(
    "  session refresh action: preserved"
)
