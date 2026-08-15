#!/usr/bin/env python3

"""Focused v1.10.10a mail engagement foundation checks."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


def section(
    text: str,
    start: str,
    end: str,
) -> str:
    left = text.index(start)
    right = text.index(
        end,
        left,
    )
    return text[left:right]


def main() -> None:
    schema = read(
        "d1/schema.sql"
    )
    engagement = read(
        "serverless/crm-email-engagement-d1.ts"
    )
    delivery = read(
        "serverless/crm-email-delivery-d1.ts"
    )
    quotes = read(
        "serverless/crm-quotes-d1.ts"
    )
    crm = read(
        "serverless/crm-d1.ts"
    )
    workflow = read(
        "serverless/crm-workflow-d1.ts"
    )
    verify = read(
        "functions/api/public/client-portal/verify.ts"
    )
    pixel = read(
        "functions/api/public/crm/email-open.ts"
    )
    types = read(
        "src/admin/types/crm.ts"
    )

    con = sqlite3.connect(
        ":memory:"
    )
    con.executescript(schema)

    columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info(crm_communications)"
        )
    }

    assert {
        "open_tracking_token_hash",
        "delivered_at",
        "opened_at",
        "clicked_at",
    } <= columns

    assert (
        "crypto.subtle.digest("
        in engagement
    )
    assert (
        '"SHA-256"'
        in engagement
    )
    assert (
        "open_tracking_token_hash = ?"
        in engagement
    )

    assert (
        "recordCrmEmailOpen"
        in pixel
    )
    assert (
        '"image/gif"'
        in pixel
    )
    assert (
        '"private, no-store, max-age=0"'
        in pixel
    )

    assert (
        "trackingPixelUrl?: string;"
        in delivery
    )
    assert (
        "function trackingPixelHtml("
        in delivery
    )

    assert (
        delivery.count(
            "trackingPixelHtml(input.trackingPixelUrl)"
        ) == 2
    )

    send_delivery = delivery[
        delivery.index(
            "export async function sendCrmEmail("
        ):
    ]

    assert (
        send_delivery.count(
            "input.trackingPixelUrl"
        ) == 3
    )

    send_quote = section(
        quotes,
        "export async function sendQuote(",
        "export async function getPublicQuotesForIdentity(",
    )

    for token in [
        "engagementToken",
        "engagementTokenHash",
        "trackedLoginUrl",
        "trackingPixelUrl",
        "open_tracking_token_hash",
    ]:
        assert token in send_quote

    assert (
        send_quote.count(
            "open_tracking_token_hash"
        ) == 1
    )

    # Failed delivery must not register a trackable mail.
    failed = send_quote[
        send_quote.index(
            "} catch (error: any) {"
        ):
        send_quote.index(
            "  await db.batch([",
            send_quote.index(
                "} catch (error: any) {"
            ),
        )
    ]

    assert (
        "open_tracking_token_hash"
        not in failed
    )

    # Existing secure auth token remains redacted from
    # CRM communication history.
    assert (
        "loggedQuoteEmailBody("
        in quotes
    )
    assert (
        '"[secure quote link]"'
        in quotes
    )

    assert (
        "recordCrmEmailClick"
        in verify
    )
    assert (
        '.get("engagement")'
        in verify
    )
    assert (
        "Engagement telemetry must never block"
        in verify
    )

    click = engagement[
        engagement.index(
            "export async function recordCrmEmailClick("
        ):
    ]

    assert (
        "clicked_at"
        in click
    )

    # A click is not falsely recorded as a separate
    # pixel-observed open.
    assert (
        "opened_at"
        not in click
    )

    lead_mail = section(
        crm,
        "function hydrateLeadMail(",
        "function hydrateJob(",
    )

    precedence = [
        lead_mail.index(
            'status === "failed"'
        ),
        lead_mail.index(
            "if (clickedAt)"
        ),
        lead_mail.index(
            "if (openedAt)"
        ),
        lead_mail.index(
            "if (deliveredAt)"
        ),
        lead_mail.index(
            'status === "sent"'
        ),
    ]

    assert (
        precedence
        == sorted(precedence)
    )

    assert (
        "latestMailByEnquiry"
        in crm
    )
    assert (
        "latestMail"
        in crm
    )
    assert (
        "candidate.channel = 'email'"
        in crm
    )
    assert (
        "candidate.direction = 'outbound'"
        in crm
    )

    enquiry_type = section(
        types,
        "export type CrmEnquiry = {",
        "export type CrmEnquiryInput = {",
    )

    for state in [
        '"none"',
        '"sent"',
        '"delivered"',
        '"opened"',
        '"clicked"',
        '"failed"',
    ]:
        assert state in enquiry_type

    communication_type = section(
        types,
        "export type CrmCommunication = {",
        "export type CrmWorkflowOverview = {",
    )

    for field in [
        "failureReason?",
        "deliveredAt?",
        "openedAt?",
        "clickedAt?",
    ]:
        assert field in communication_type

    for token in [
        "failureReason:",
        "deliveredAt:",
        "openedAt:",
        "clickedAt:",
    ]:
        assert token in workflow

    print(
        "PASS v1.10.10a mail engagement foundation"
    )
    print(
        "  hashed first-party open tracking: verified"
    )
    print(
        "  managed / Gmail / SMTP pixel rendering: verified"
    )
    print(
        "  secure quote-link click tracking: verified"
    )
    print(
        "  failed-send tracking exclusion: verified"
    )
    print(
        "  Lead mail-status precedence: verified"
    )
    print(
        "  overview/detail communication model: verified"
    )


if __name__ == "__main__":
    main()
