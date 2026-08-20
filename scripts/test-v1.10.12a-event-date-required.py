#!/usr/bin/env python3

from pathlib import Path


crm = Path(
    "serverless/crm-d1.ts"
).read_text(
    encoding="utf-8",
)

quotes = Path(
    "serverless/crm-quotes-d1.ts"
).read_text(
    encoding="utf-8",
)

lead_form = Path(
    "src/components/LeadEnquiryForm.tsx"
).read_text(
    encoding="utf-8",
)

admin = Path(
    "src/admin/pages/CRM.tsx"
).read_text(
    encoding="utf-8",
)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


# Wedding date must be protected.
locked_start = crm.index(
    "const LEAD_FORM_LOCKED_SYSTEM_KEYS"
)

locked_end = crm.index(
    "]);",
    locked_start,
)

locked = crm[
    locked_start:
    locked_end
]

require(
    '"eventDate"' in locked,
    "Wedding date must be locked.",
)


# Default Wedding date field is mandatory.
event_start = crm.index(
    '    id: "eventDate",'
)

event_end = crm.index(
    '    id: "dateFlexibility",',
    event_start,
)

event = crm[
    event_start:
    event_end
]

for marker in (
    "required: true",
    "enabled: true",
    "locked: true",
):
    require(
        marker in event,
        f"Wedding date missing {marker}.",
    )


# A custom saved form cannot omit the protected date field.
protected_start = crm.index(
    "  for (const systemKey of ["
)

protected_end = crm.index(
    "  ]) {",
    protected_start,
)

protected = crm[
    protected_start:
    protected_end
]

require(
    '"eventDate"' in protected,
    "Missing Wedding date must be restored during normalisation.",
)


# Public React form already honours field.required.
require(
    "required: field.required"
    in lead_form,
    "Public form must apply required state.",
)

require(
    "required={field.required}"
    in lead_form,
    "Public form controls must honour required fields.",
)


# Explicit server guard occurs before the first write.
submit_start = crm.index(
    "export async function submitPublicEnquiry"
)

date_guard = crm.index(
    '"Wedding date is required."',
    submit_start,
)

first_write = crm.index(
    "await upsertContact",
    submit_start,
)

require(
    date_guard < first_write,
    "Public date guard must run before contact writes.",
)


# Admin already disables controls for locked fields.
require(
    "|| field.locked"
    in admin,
    "Admin must honour locked lead fields.",
)


# Quote send cannot create a client invitation without a date.
send_start = quotes.index(
    "export async function sendQuote("
)

send_guard = quotes.index(
    "Add the wedding/event date before sending this quote.",
    send_start,
)

invitation = quotes.index(
    "await createInvitation(",
    send_start,
)

require(
    send_guard < invitation,
    "Quote date guard must run before invitation creation.",
)


# Existing final booking protection remains.
require(
    "Add the wedding/event date before accepting this booking."
    in crm,
    "Booking conversion date guard must remain.",
)


print(
    "PASS v1.10.12a mandatory event-date journey"
)

print(
    "  Wedding date field required: verified"
)

print(
    "  Wedding date field locked: verified"
)

print(
    "  omitted custom-field recovery: verified"
)

print(
    "  public API pre-write guard: verified"
)

print(
    "  quote-send guard: verified"
)

print(
    "  booking conversion guard: retained"
)
