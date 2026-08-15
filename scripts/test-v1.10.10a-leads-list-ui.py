#!/usr/bin/env python3

"""Focused v1.10.10a WedCRM Leads list UI checks."""

from pathlib import Path


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
    page = read(
        "src/admin/pages/CRM.tsx"
    )

    css = read(
        "src/admin/admin-theme.css"
    )

    types = read(
        "src/admin/types/crm.ts"
    )

    lead = section(
        page,
        "function LeadRecord(",
        "function JobRecord(",
    )

    # Approved Leads columns.
    for heading in [
        ">Created<",
        ">Lead<",
        ">Service<",
        ">Event date<",
        ">Mail Status<",
        ">Next action<",
    ]:
        assert heading in page

    # List is a dedicated Lead presentation and no longer
    # reuses the more card-like Job record layout.
    assert (
        'className="crm-lead-row"'
        in lead
    )

    assert (
        'className="crm-lead-row__main"'
        in lead
    )

    assert (
        "crm-operation-record"
        not in lead
    )

    # Lead identity retains useful reference/stage context.
    assert (
        "enquiry.reference"
        in lead
    )

    assert (
        "enquiry.stageName"
        in lead
    )

    # Service and event date.
    assert (
        "enquiry.serviceInterest"
        in lead
    )

    assert (
        "enquiry.eventDate"
        in lead
    )

    # Real Mail Status read model.
    assert (
        "enquiry.mailStatus"
        in lead
    )

    assert (
        "enquiry.mailStatusAt"
        in lead
    )

    assert (
        "enquiry.mailSubject"
        in lead
    )

    # Required colour semantics:
    # none grey; sent/delivered amber; opened green;
    # clicked blue; failed red, represented through AdminStatus
    # tones neutral/warning/success/info/danger.
    mail_tone = section(
        page,
        "function mailStatusTone(",
        "function mailStatusLabel(",
    )

    for token in [
        '"neutral"',
        '"warning"',
        '"success"',
        '"info"',
        '"danger"',
    ]:
        assert token in mail_tone

    mail_label = section(
        page,
        "function mailStatusLabel(",
        "function dateLabel(",
    )

    for label in [
        '"None"',
        '"Sent"',
        '"Delivered"',
        '"Opened"',
        '"Link clicked"',
        '"Failed"',
    ]:
        assert label in mail_label

    # Next action remains tied to existing lead lifecycle logic.
    assert (
        "nextLeadAction("
        in lead
    )

    # Ellipsis action menu remains.
    assert (
        "MoreVertical"
        in lead
    )

    assert (
        "Open lead"
        in lead
    )

    assert (
        "Open Job"
        in lead
    )

    # Board mode remains available.
    assert (
        'pipelineDisplay === "board"'
        in page
    )

    assert (
        'className="crm-pipeline"'
        in page
    )

    # Mobile is a labelled stacked layout rather than an
    # unreadable wide desktop table.
    for token in [
        ".crm-lead-list {",
        ".crm-lead-list__header {",
        ".crm-lead-row {",
        ".crm-lead-row__main {",
        ".crm-lead-cell {",
        "content: attr(data-label)",
    ]:
        assert token in css

    # Read-model contract still exposes all engagement states.
    enquiry_type = section(
        types,
        "export type CrmEnquiry = {",
        "export type CrmEnquiryInput = {",
    )

    for status in [
        '"none"',
        '"sent"',
        '"delivered"',
        '"opened"',
        '"clicked"',
        '"failed"',
    ]:
        assert status in enquiry_type

    print(
        "PASS v1.10.10a WedCRM Leads list UI"
    )
    print(
        "  Created / Lead / Service / Event date columns: verified"
    )
    print(
        "  real Mail Status presentation: verified"
    )
    print(
        "  Next action and row menu: verified"
    )
    print(
        "  existing board view preserved: verified"
    )
    print(
        "  compact responsive mobile layout: verified"
    )


if __name__ == "__main__":
    main()
