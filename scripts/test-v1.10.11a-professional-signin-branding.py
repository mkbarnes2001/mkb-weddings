#!/usr/bin/env python3
"""Focused v1.10.11a professional sign-in branding regression."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

auth = (
    ROOT
    / "src/admin/auth/ProfessionalAuth.tsx"
).read_text(
    encoding="utf-8",
)

css = (
    ROOT
    / "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)

# The shared professional entry point must never inherit
# tenant / MKB branding.
assert 'src="/favicon-32x32.png"' not in auth
assert 'alt="MKB Weddings"' not in auth
assert "MKB Weddings" not in auth

# Use the native WedPlanned text-wordmark fallback and
# dedicated Admin styling rather than legacy inline styles.
for token in (
    'aria-label="WedPlanned"',
    'className="professional-auth-brand"',
    'className="professional-auth-brand__wed"',
    'className="professional-auth-brand__planned"',
    ">\n            Wed\n          </span>",
    ">\n            Planned\n          </span>",
):
    assert token in auth, token

for token in (
    ".professional-auth-brand__wed",
    '"WedPlanned Canela"',
    '"Canela"',
    "font-style: italic;",
    ".professional-auth-brand__planned",
):
    assert token in css, token

# Legacy inline branding implementation must stay removed.
assert 'style={{' not in auth[
    auth.index(
        'className="professional-auth-brand"'
    ):
    auth.index(
        'className="professional-auth-eyebrow"'
    )
]

# Professional authentication language remains platform-level
# and matches the current WedPlanned public access language.
for token in (
    "Professional access",
    "Sign in to your workspace.",
    "business membership",
):
    assert token in auth, token

assert "WedPlanned Pro sign in" not in auth

print(
    "PASS v1.10.11a professional sign-in branding"
)
print(
    "  MKB tenant branding removed: verified"
)
print(
    "  WedPlanned platform wordmark fallback: verified"
)
print(
    "  dedicated Canela wordmark styling: verified"
)
print(
    "  current professional authentication messaging: verified"
)
