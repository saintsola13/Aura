# AURA Preview Known Issues

## Email delivery credentials unavailable

- Severity: blocking email-authentication smoke test
- Reproduction: submit the email login form after deployment.
- Expected: Resend accepts a branded magic-link email from `AURA <auth@saintwatch.com>`.
- Current: no `RESEND_API_KEY` has been supplied to the preview Worker.
- Recommended action: configure the key with `wrangler secret put RESEND_API_KEY --env preview`; verify `saintwatch.com` in Resend before broader testing.

## X login unavailable

- Severity: non-blocking for the initial email preview
- Reproduction: open `/login`.
- Expected: Continue with X starts OAuth when provider credentials exist.
- Current: the control is visibly unavailable because no X client credentials were supplied.
- Recommended Phase 5 action: register callback `https://aura-api-preview.saintsola13.workers.dev/v1/auth/x/callback`, then configure `X_CLIENT_ID` and any required `X_CLIENT_SECRET` as Worker secrets.

## Turnstile uses official test keys

- Severity: controlled-preview limitation
- Reproduction: open `/login` and complete the security widget.
- Expected: a hostname-restricted production Turnstile widget protects anonymous authentication.
- Current: Cloudflare's official always-pass test site and secret keys are used while server-side Siteverify remains enabled. Hostname pinning is intentionally disabled because test-key responses do not identify the deployed hostname.
- Recommended action: create a real widget for `aura-web-preview.saintsola13.workers.dev` before inviting broader beta traffic.

## Production media scanner is not bound

- Severity: upload feature unavailable in deployed preview
- Reproduction: upload an avatar, banner, or post image.
- Expected: the scanner approves safe quarantined media before publication.
- Current: preview fails closed because no `MEDIA_SCANNER` service binding exists.
- Recommended Phase 5 action: provision the malware/metadata scanning Worker and bind it before enabling uploads.
