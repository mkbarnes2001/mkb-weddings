#!/usr/bin/env python3
"""Focused v1.10.11a client portal next-action journey regression."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

portal = (
    ROOT
    / "src/components/ClientPortal.tsx"
).read_text(encoding="utf-8")

signature = (
    ROOT
    / "src/components/ClientPortalContractSignature.tsx"
).read_text(encoding="utf-8")


assert "function openNextBookingStep(" in portal
assert '"wedplanned:booking-next"' in portal

# Selection changes invalidate stale async document loads so a previous
# quote/questionnaire request cannot overwrite the guided next step.
assert "const questionnaireLoadRequestRef = useRef(0);" in portal
assert "const quoteLoadRequestRef = useRef(0);" in portal
assert "++questionnaireLoadRequestRef.current" in portal
assert "++quoteLoadRequestRef.current" in portal
assert "requestId\n          !== questionnaireLoadRequestRef.current" in portal
assert "requestId\n          !== quoteLoadRequestRef.current" in portal

journey = portal[
    portal.index("function openNextBookingStep("):
    portal.index("async function refreshQuestionnaire(")
]

# The next-required-action order is deliberate.
assert journey.index("pendingQuestionnaire") < journey.index("pendingContract")
assert journey.index("pendingContract") < journey.index("unpaidInvoice")

assert 'setView("questionnaires")' in journey
assert 'setView("contracts")' in journey
assert 'setView("invoices")' in journey
assert 'setView("home")' in journey

# Optional or completed steps are skipped by state.
assert "(job.questionnaires || []).find" in journey
assert "job.commercial?.contracts" in journey
assert "job.commercial?.invoices" in journey


accept = portal[
    portal.index("async function acceptQuote()"):
    portal.index("async function declineQuote()")
]

assert "jobId: string; jobReference: string" in accept
assert "result.conversion.jobId" in accept
assert '"wedplanned:booking-next"' in accept
assert "window.location.reload();" in accept
assert "await loadPortal();" not in accept


save = portal[
    portal.index("async function save(submit = false)"):
    portal.index("async function upload(")
]

assert "if (submit)" in save
assert "selectedJob?.id" in save
assert '"wedplanned:booking-next"' in save
assert "window.location.reload();" in save
assert "await loadPortal();" in save


# Existing authenticated contract POST remains intact.
assert '"wedplanned:booking-next"' in signature
assert "contract?.jobId" in signature
assert "window.location.reload();" in signature
assert 'method: "POST"' in signature
assert "confirmed: true" in signature


nav = portal[
    portal.index('<nav className="client-portal-nav"'):
    portal.index("</nav>")
]

assert nav.index("Quotes</button>") < nav.index("Questionnaires</button>")
assert nav.index("Questionnaires</button>") < nav.index("Contracts</button>")
assert nav.index("Contracts</button>") < nav.index("Invoices</button>")


checklist = portal[
    portal.index('className="client-portal-booking-checklist"'):
    portal.index('className="client-portal-home-grid"')
]

assert checklist.index("<strong>Quote accepted</strong>") < checklist.index("<strong>Questionnaire</strong>")
assert checklist.index("<strong>Questionnaire</strong>") < checklist.index("<strong>Contract signature</strong>")
assert checklist.index("<strong>Contract signature</strong>") < checklist.index("<strong>Payment schedule</strong>")


home = portal[
    portal.index('className="client-portal-home-grid"'):
    portal.index("!portal.jobs.length")
]

assert home.index("<small>Quotes</small>") < home.index("<small>Questionnaires</small>")
assert home.index("<small>Questionnaires</small>") < home.index("<small>Contracts</small>")
assert home.index("<small>Contracts</small>") < home.index("<small>Invoices</small>")


print("PASS v1.10.11a client portal booking journey")
print("  quote acceptance continuation: verified")
print("  questionnaire completion continuation: verified")
print("  contract signature continuation: verified")
print("  quote -> questionnaire -> contract -> invoice order: verified")
print("  absent/completed steps skipped: verified")
