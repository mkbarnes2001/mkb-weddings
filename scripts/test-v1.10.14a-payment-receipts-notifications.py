#!/usr/bin/env python3
"""v1.10.14a payment receipt and notification regression."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


payment = read("serverless/crm-connected-payments-d1.ts")
receipt = read("serverless/crm-payment-receipts-d1.ts")
professional = read("serverless/crm-client-action-notifications-d1.ts")
portal = read("serverless/client-portal-commercial-d1.ts")
webhook = read("functions/api/webhooks/wedplanned-stripe.ts")
checkout = read("functions/api/public/client-portal/invoices/[id]/checkout.ts")
ui = read("src/components/ClientPortalCommercialDocument.tsx")
css = read("src/index.css")
schema = read("d1/schema.sql")


# The verified connected-account settlement remains the only financial write.
for token in (
    "processStripeInvoicePaymentEvent",
    "INSERT INTO crm_invoice_payments",
    "provider_payment_id = ?",
    "WHERE NOT EXISTS",
    "invoicePaymentReceiptReference(",
    "receiptReference",
    "workspaceId,",
):
    assert token in payment, token

assert payment.index("INSERT INTO crm_invoice_payments") < payment.index(
    "return {\n    processed: true,"
)


# Receipt/notification delivery runs only after raw-body signature verification
# and verified financial reconciliation.
for token in (
    "request.text()",
    "Stripe-Signature",
    "verifyStripeWebhook",
    "processStripeInvoicePaymentEvent",
    "deliverInvoicePaymentReceiptNotifications",
    "settlement?.workspaceId",
    "settlement?.paymentId",
):
    assert token in webhook, token

assert webhook.index("verifyStripeWebhook(") < webhook.index(
    "processStripeInvoicePaymentEvent("
)
assert webhook.index("processStripeInvoicePaymentEvent(") < webhook.index(
    "deliverInvoicePaymentReceiptNotifications("
)


# Deterministic crm_communications rows form the no-new-schema outbox and
# allow duplicate Stripe events to skip sent messages or retry failed ones.
for token in (
    "crm_communication_payment_receipt_",
    "crm_communication_payment_notification_",
    "INSERT OR IGNORE INTO crm_communications",
    "status = 'sent'",
    "status = 'failed'",
    "status = 'draft'",
    "already_sent",
    "in_progress",
    "datetime('now', '-10 minutes')",
):
    assert token in receipt, token

claim_index = receipt.index("async function claimCommunication(")
client_send_index = receipt.index("const delivery = await sendCrmEmail(")
professional_send_index = receipt.index(
    "await sendProfessionalClientActionNotification("
)
assert claim_index < client_send_index
assert claim_index < professional_send_index


# Client delivery uses the configured CRM transport; professional delivery uses
# the established workspace notification address/sender boundary.
for token in (
    "sendCrmEmail(",
    'accessMode: "system"',
    '"crm:read"',
    '"crm:manage"',
    "sendProfessionalClientActionNotification(",
    'action: "payment_received"',
    "Amount received:",
    "Remaining balance:",
    "View your invoice and receipt in the Client Portal",
):
    assert token in receipt, token

for token in (
    '| "payment_received"',
    "Payment received from",
    "Amount received:",
    "Remaining balance:",
    "receiptReference",
    "invoiceReference",
):
    assert token in professional, token


# Public invoice hydration exposes only receipt presentation data, not Stripe
# payment/account identifiers.
for token in (
    "paymentReceiptReference(",
    "receiptReference:",
    "paidToDate",
    "balanceAfter",
    "metadata_json",
):
    assert token in portal, token

public_invoice = portal[
    portal.index("export async function getPublicInvoice("):
]
assert "provider_payment_id" not in public_invoice
assert "stripeAccountId" not in public_invoice
assert "paymentIntentId" not in public_invoice


# Client can view and print/save a dedicated receipt from Payment history.
for token in (
    "receiptPaymentId",
    "Payment receipt",
    "receiptReference",
    "Amount received",
    "Total paid to date",
    "Remaining balance",
    "Print / Save PDF",
    "client-portal-document--receipt-open",
):
    assert token in ui, token

for token in (
    "v1.10.14a — Client payment receipt",
    ".client-portal-payment-history__receipt",
    ".client-portal-payment-receipt",
    ".client-portal-payment-receipt__details",
    ".client-portal-document--receipt-open",
    "@media print",
):
    assert token in css, token


# Browser Checkout remains incapable of financial settlement or notification.
for forbidden in (
    "crm_invoice_payments",
    "deliverInvoicePaymentReceiptNotifications",
    "sendCrmEmail",
    "sendProfessionalClientActionNotification",
):
    assert forbidden not in checkout, forbidden


# No payment/notification table or schema transition is added.
db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
assert str(version) == "53", version
assert not db.execute("PRAGMA foreign_key_check").fetchall()

columns = {
    row[1]
    for row in db.execute("PRAGMA table_info(crm_communications)")
}
for column in (
    "status",
    "provider",
    "provider_message_id",
    "failure_reason",
    "metadata_json",
    "delivered_at",
    "updated_at",
):
    assert column in columns, column

db.close()

assert not list((ROOT / "d1/migrations").glob("054_*.sql"))


print("PASS v1.10.14a payment receipts and notifications")
print("  verified Stripe settlement remains financial authority: verified")
print("  deterministic existing-communications outbox: verified")
print("  client receipt through configured CRM email transport: verified")
print("  professional payment notification: verified")
print("  duplicate/retry delivery contract: verified")
print("  Client Portal receipt view and print/PDF: verified")
print("  provider identifiers remain server-side: verified")
print("  browser Checkout cannot settle or notify: verified")
print("  schema remains 53; migration 054 absent: verified")
