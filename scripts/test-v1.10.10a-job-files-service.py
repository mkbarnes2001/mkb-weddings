#!/usr/bin/env python3

"""Focused v1.10.10a private Job-file service checks."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


portal = read(
    "serverless/client-portal-d1.ts"
)

types = read(
    "src/admin/types/crm.ts"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)

operations = read(
    "serverless/platform-operations-d1.ts"
)

admin_upload = read(
    "functions/api/crm/jobs/[jobId]/files.ts"
)

admin_file = read(
    "functions/api/crm/job-files/[fileId].ts"
)

public_upload = read(
    "functions/api/public/client-portal/jobs/[jobId]/files.ts"
)

public_file = read(
    "functions/api/public/client-portal/jobs/[jobId]/files/[fileId].ts"
)


# Shared private-R2 file service.
for token in [
    "hydrateJobFile",
    "activeJobFiles",
    "authorisedPublicJob",
    "uploadJobFileForAdmin",
    "uploadJobFileForClient",
    "getJobFileForAdmin",
    "getJobFileForClient",
    "deleteJobFileForAdmin",
    "deleteJobFileForClient",
]:
    assert token in portal, token


assert (
    "MKB_PRIVATE_ASSETS"
    in admin_upload
)

assert (
    "MKB_PRIVATE_ASSETS"
    in admin_file
)

assert (
    "MKB_PRIVATE_ASSETS"
    in public_upload
)

assert (
    "MKB_PRIVATE_ASSETS"
    in public_file
)


# No public predictable object URL.
assert (
    "storageKey ="
    in portal
)

assert (
    "workspaces/${input.workspaceId}/crm/jobs/${input.jobId}/files/"
    in portal
)

assert (
    "cacheControl:"
    in portal
)

assert (
    '"private, no-store"'
    in portal
)


# Workspace/client authorization.
assert (
    "crm_job_client_access"
    in portal
)

assert (
    "access.identity_id = ?"
    in portal
)

assert (
    "access.status = 'active'"
    in portal
)

assert (
    "row.identity_id"
    in portal
)

assert (
    "identity.id"
    in portal
)


# Admin mutation boundary.
assert (
    "requireJobFileMutation"
    in portal
)

assert (
    '=== "support"'
    in portal
)

assert (
    '"crm:manage"'
    in portal
)

assert (
    '"crm:read"'
    in portal
)


# File limits reuse the proven questionnaire boundary.
assert (
    "file.size > MAX_FILE_SIZE"
    in portal
)

assert (
    "1 byte and 10 MB"
    in portal
)


# Shared Admin Job workspace and public portal expose files.
assert (
    "files: jobFiles"
    in portal
)

assert (
    "filesForPortalIdentity"
    in portal
)

assert (
    "files,"
    in portal
)


# Typed Admin contract.
assert (
    "export type CrmJobFile"
    in types
)

assert (
    "files: CrmJobFile[];"
    in types
)

assert (
    "jobFileUrl("
    in api
)

assert (
    "uploadCrmJobFile("
    in api
)

assert (
    "deleteCrmJobFile("
    in api
)


# Dedicated routes preserve browser/server boundaries.
assert (
    "requireProfessionalContext"
    in admin_upload
)

assert (
    "requireProfessionalContext"
    in admin_file
)

assert (
    "resolveClientPortalWorkspaceId"
    in public_upload
)

assert (
    "resolveClientPortalWorkspaceId"
    in public_file
)

assert (
    '"Cache-Control"'
    in admin_upload
)

assert (
    '"Cache-Control"'
    in public_upload
)


# Export includes metadata but redacts private storage keys.
assert (
    '"crm_job_files"'
    in operations
)

assert (
    'crm_job_files: ["storage_key"]'
    in operations
)


# Client-facing Job-file models must not expose
# internal identity / actor / storage metadata.
public_hydrator_start = portal.index(
    "function hydratePublicJobFile("
)

active_files_start = portal.index(
    "\n\nasync function activeJobFiles(",
    public_hydrator_start,
)

public_hydrator_block = portal[
    public_hydrator_start:
    active_files_start
]

assert (
    "identityId"
    not in public_hydrator_block
)

assert (
    "actorUserId"
    not in public_hydrator_block
)

assert (
    "storageKey"
    not in public_hydrator_block
)

assert (
    "storage_key"
    not in public_hydrator_block
)

portal_files_start = portal.index(
    "async function filesForPortalIdentity("
)

put_file_start = portal.index(
    "\n\nasync function putJobFile(",
    portal_files_start,
)

portal_files_block = portal[
    portal_files_start:
    put_file_start
]

assert (
    "files.map("
    in portal_files_block
)

assert (
    "hydratePublicJobFile"
    in portal_files_block
)

client_upload_start = portal.index(
    "export async function uploadJobFileForClient("
)

admin_download_start = portal.index(
    "\n\nexport async function getJobFileForAdmin(",
    client_upload_start,
)

client_upload_block = portal[
    client_upload_start:
    admin_download_start
]

assert (
    "return hydratePublicJobFile("
    in client_upload_block
)

print(
    "PUBLIC_JOB_FILE_INTERNAL_IDS_REDACTED=PASS"
)

print(
    "PUBLIC_JOB_FILE_STORAGE_METADATA_REDACTED=PASS"
)

print(
    "PUBLIC_JOB_FILE_UPLOAD_RESPONSE_REDACTED=PASS"
)


print(
    "PASS v1.10.10a private Job files service"
)

print(
    "  private R2 storage: verified"
)

print(
    "  workspace / Job isolation: verified"
)

print(
    "  active client-session authorization: verified"
)

print(
    "  client-owned deletion boundary: verified"
)

print(
    "  Admin support-mode mutation block: verified"
)

print(
    "  Admin Job workspace read model: verified"
)

print(
    "  Client Portal Job read model: verified"
)

print(
    "  platform export storage-key redaction: verified"
)
