#!/usr/bin/env python3

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


UI = (
    ROOT
    / "src/components/ClientPortalCommercialDocument.tsx"
).read_text(
    encoding="utf-8",
)

ROUTE = (
    ROOT
    / "functions/api/public/client-portal/invoices/[id]/checkout.ts"
).read_text(
    encoding="utf-8",
)


# Invoice UI exposes Stripe Checkout.
for token in [
    "CreditCard",
    "payByCard",
    "paymentBusy",
    "paymentError",
    "/checkout",
    "scheduleItemId",
    "Opening Stripe",
    "Pay by card",
    "window.location.assign",
]:
    assert token in UI, token


# Primary action pays the next outstanding instalment when one exists.
for token in [
    "const nextPayment",
    "item.balanceAmount > 0",
    "nextPayment?.id",
    "nextPayment.balanceAmount",
]:
    assert token in UI, token


# Explicit schedule rows can initiate their own payment.
assert (
    "void payByCard(\n"
    "                          item.id,"
    in UI
)


# Paid invoice / instalment actions are not shown.
assert (
    "invoice.balanceAmount > 0"
    in UI
)

assert (
    "item.balanceAmount > 0"
    in UI
)


# Checkout POST does not attempt financial settlement in-browser.
for forbidden in [
    "crm_invoice_payments",
    "processStripeInvoicePaymentEvent",
    "invoice.payment_recorded",
]:
    assert forbidden not in UI, forbidden
    assert forbidden not in ROUTE, forbidden


# Checkout route remains server-authorised.
for token in [
    "getPublicInvoiceCheckoutContext",
    "beginStripeInvoiceCheckout",
    "resolveClientPortalWorkspaceId",
]:
    assert token in ROUTE, token


print(
    "PASS v1.10.12a client invoice payment UI"
)

print(
    "  primary Pay by card action: verified"
)

print(
    "  next-instalment amount: verified"
)

print(
    "  explicit instalment payment: verified"
)

print(
    "  paid obligations hide payment action: verified"
)

print(
    "  Stripe redirect: verified"
)

print(
    "  browser cannot settle invoice: verified"
)
