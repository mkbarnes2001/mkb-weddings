#!/usr/bin/env python3
"""Focused v1.10.11a professional sign-in branding regression."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

auth = (
    ROOT
    / "src/admin/auth/ProfessionalAuth.tsx"
).read_text(encoding="utf-8")

# The shared professional entry point must never inherit tenant/MKB branding.
assert 'src="/favicon-32x32.png"' not in auth
assert 'alt="MKB Weddings"' not in auth
assert "MKB Weddings" not in auth

# Use the same native WedPlanned text-wordmark fallback as the public site.
assert 'aria-label="WedPlanned"' in auth
assert '"Times New Roman", Times, serif' in auth
assert "fontStyle: \"italic\"" in auth
assert ">\n            Wed\n          </span>" in auth
assert ">\n            Planned\n          </span>" in auth

# Professional authentication language remains platform-level.
assert "Professional access" in auth
assert "WedPlanned Pro sign in" in auth
assert "business membership" in auth

print("PASS v1.10.11a professional sign-in branding")
print("  MKB tenant branding removed: verified")
print("  WedPlanned platform wordmark fallback: verified")
print("  professional authentication messaging preserved: verified")
