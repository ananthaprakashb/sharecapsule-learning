# ShareCapsule Prepare report format

Prepare exports progress as tamper-evident local files that can later be shared back to the web application without requiring an account or server-side learner profile.

## File types

- `*.prepare.json` — one signed assessment snapshot.
- `*.prepare.zip` — a progress bundle for one target. Contains signed assessment reports, a signed `manifest.prepare.json`, and a text README.

## Privacy model

The full assessment payload is created and stored in the browser/device. During report creation, Prepare sends only:

- report format/version
- report type
- random report id
- creation timestamp
- SHA-256 payload hash

The Worker returns an HMAC-SHA256 signature. Raw diagnostic answers, job-description text, and project narratives are intentionally excluded from the exported progress payload.

The full report is sent to the server only if the learner later chooses to share/upload it for progress tracking.

## Assessment envelope

```json
{
  "format": "sharecapsule.prepare.report",
  "schemaVersion": 1,
  "reportType": "assessment",
  "reportId": "UUID",
  "createdAt": "ISO-8601 timestamp",
  "payload": {
    "payloadVersion": 1,
    "target": {},
    "assessment": {},
    "learningProgress": [],
    "privacy": {},
    "generatedBy": {}
  },
  "integrity": {
    "hashAlgorithm": "SHA-256",
    "signatureAlgorithm": "HMAC-SHA256",
    "payloadHash": "64 hex characters",
    "signature": "base64url",
    "keyId": "prepare-report-v1"
  }
}
```

The payload is canonicalized by recursively sorting object keys before SHA-256 hashing. The signature authenticates:

```text
format
schemaVersion
reportType
reportId
createdAt
payloadHash
```

Any payload modification changes the computed hash and invalidates verification.

## Progress bundle

A progress ZIP contains:

```text
manifest.prepare.json
README.txt
reports/<assessment>.prepare.json
reports/<assessment>.prepare.json
...
```

`manifest.prepare.json` is itself a signed Prepare report with `reportType = progress-bundle-manifest`. Its payload lists the exact report ids, file names, hashes, signatures, and key ids expected in the bundle.

## Upload safety rules

Treat every uploaded file as hostile input even when its extension looks correct.

A future upload endpoint should:

1. Enforce a small maximum ZIP size before parsing.
2. Limit entry count and total uncompressed bytes to prevent ZIP bombs.
3. Reject absolute paths, `..`, duplicate names, nested archives, symlinks, executables, and unexpected file types.
4. Accept only `manifest.prepare.json`, `README.txt`, and manifest-listed `reports/*.prepare.json` entries.
5. Parse JSON only; never evaluate JavaScript or HTML from an uploaded report.
6. Enforce schema version, field lengths, array-count limits, numeric ranges, and timestamp formats.
7. Recompute the canonical SHA-256 hash for every report payload.
8. Verify the HMAC signature before accepting any progress data.
9. Ensure every manifest-listed report exists exactly once and reject unlisted report files.
10. Never trust filenames, labels, scores, or target keys until cryptographic verification succeeds.
11. Store only normalized fields required for progress tracking.
12. Keep rejected files out of downstream parsers, analytics, and rendering paths.

## Security boundary

This format is **tamper-evident, not physically uneditable and not an anti-cheating proof**. A learner controls their local browser/device. The signature protects the integrity of a snapshot after Prepare signs it and protects the service from accepting modified/corrupted packages. It does not prove that a person completed an assessment without manipulating their browser before the snapshot was created.

If stronger assessment attestation is required later, introduce server-issued assessment sessions and signed event receipts while continuing to keep raw answers local whenever possible.
