# Security controls

This frontend implements defence-in-depth. **UI checks are never the only control** — the backend must enforce every rule marked *Backend must*.

## Transport & browser hardening
- Per-request **Content-Security-Policy** with a nonce and `strict-dynamic` (`src/proxy.ts`): no inline or third-party scripts, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests` in production. `'unsafe-eval'` is added only in development (React dev tooling).
  - `style-src` allows `'unsafe-inline'` because charts and progress bars use inline style attributes; scripts remain nonce-locked.
- Static headers (`next.config.ts`): HSTS (2 years, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` (camera/microphone for the page's own origin only, for interview/voice practice), COOP/CORP same-origin, `X-Powered-By` removed, no production source maps, `Cache-Control: no-store` on API responses.
- Fonts are self-hosted via `next/font`; no external CDNs at runtime.

## Authentication & sessions
- Session is an HMAC-SHA256-signed token in an **HttpOnly, Secure (production), SameSite=Strict** cookie. Nothing sensitive is kept in `localStorage`; tokens never appear in URLs.
- **MFA** is required before any portal loads; the pre-MFA session lasts 10 minutes. MFA attempts are limited to 5 per 10 minutes; login to 10 per 15 minutes per client in production.
- Login errors are generic ("Invalid email or password") so they don't reveal whether an account exists.
- **Idle timeout** (30 min, warning at 28) and **cross-tab sign-out** via `BroadcastChannel`, for shared lab computers.
- CSRF token rotated at the MFA privilege change.

## Authorisation
- Each role can enter only its own portal: enforced in the proxy **and** again server-side in `src/app/[role]/layout.tsx` (`requireRole`). Prefetch requests are not exempt from the proxy.
- Module pages for other roles return 404 (not 403), and page titles don't reveal module names.
- The mock API checks role permissions and **object ownership** (e.g. interview sessions) on every call. *Backend must* enforce tenant isolation (`tenant_id`, `university_id`, `college_id`, `department_id`) at API and database layers.

## Multi-college tenancy
- The session carries the college scope (`college`). Only the University Super Admin may hold the `all` scope; session verification rejects anything else, and the scope switch endpoint is Super-Admin-only and audit-logged.
- Every college-owned record is filtered by college on list, read, update and delete; out-of-scope records return 404 (no existence leak). New records take their college from the session; clients cannot set or change `collegeId`.
- Suspending a college is enforced on every API request and every portal page render, not just at sign-in.
- Module areas disabled for a college are removed from menus and blocked at page and API level.
- *Backend must* apply the same college filter in the database layer (e.g. row-level security on `college_id`).

## CSRF & request integrity
- Double-submit CSRF token (`ciq_csrf` cookie + `x-csrf-token` header, constant-time comparison) on every state-changing request.
- `Origin` / `Sec-Fetch-Site` check blocks cross-site POSTs.
- JSON-only bodies, 64 KB limit, Zod validation of every request body server-side, safe-character route IDs.

## XSS & content safety
- React escapes all text. `dangerouslySetInnerHTML` is banned by lint (`react/no-danger`).
- AI and rich text render only through `SafeMarkdown` (raw HTML skipped, `rehype-sanitize`, images dropped, links restricted to http(s)/mailto/relative with `rel="noopener noreferrer nofollow"`).
- User chat messages are rendered as plain text, never markdown.
- Input normalisation strips control, zero-width and bidi-override characters.

## Redirects
- `?next=` and any API-provided links pass through `safeNextPath`: same-origin paths only; `//host`, `/\host`, encoded slashes, control characters and absolute URLs are rejected. After MFA, `next` is honoured only if it stays inside the user's own portal.

## Uploads
- Answer sheets and resumes are checked client-side for allow-listed MIME type, matching extension, size limit and **file signature (magic bytes)**; previews use object URLs that are revoked. *Backend must* repeat these checks and malware-scan files.

## Privacy
- Roll numbers, emails and IPs are masked in shared list views and excluded from list search.
- The service worker caches only static assets and an offline page — never API responses or authenticated pages.
- Security settings default to: no training on tenant data, personal-data masking before model calls, attendance-based signals off unless legally permitted.

## Responsible AI (UI)
- Every AI output is labelled "AI-generated — verify" with a confidence value; institution-sourced answers are distinguished from general explanations.
- AI marks are provisional; faculty approve or override with a mandatory reason, and each decision is audit-logged.
- Early-warning output is a "support recommendation" for human review, never a label. Wellness content is educational and non-diagnostic, with an escalation path.
- Client-side throttling on AI chat (8 messages/min) plus server-side limits (30 AI requests/min/user); a prompt-injection heuristic in the mock gateway refuses instruction-override attempts. *Backend must* run the real injection filtering, document-access filtering and tool authorisation.

## Supply chain
- Dependencies pinned with `--save-exact`; `npm run audit` reports **0 production vulnerabilities** at the time of writing. (Next.js 16 was chosen over 15 because Next 15's bundled PostCSS carries a high-severity advisory.)
