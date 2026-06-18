# KampusRaf Security Hardening

This checklist focuses on free or low-friction protections that should not slow
down normal page rendering.

## Already implemented in code

- Next Proxy rate limiting for pages, API endpoints, and mutation requests.
- Body size limits for API and Server Action requests.
- Cross-site mutation protection using `Origin`, `Referer`, and Fetch Metadata.
- Scanner path blocking for common non-Next targets such as `.env`, `.git`,
  `wp-admin`, `phpmyadmin`, and `.php` probes.
- Security headers: CSP, HSTS, frame blocking, `nosniff`, referrer policy,
  permissions policy, and API `X-Robots-Tag`.
- Shared input validation helpers for text, UUIDs, internal redirects, URLs,
  and image upload metadata.
- `security.txt` and a responsible disclosure policy page.
- Dependabot version update configuration.

## Free dashboard settings to enable

### Vercel

- Open the project in Vercel.
- Go to Firewall.
- Keep the default DDoS protection enabled.
- Add a custom rule only if you see abuse patterns in the traffic view.
- Use Attack Challenge Mode only during suspicious traffic spikes.

### GitHub

- Enable Dependabot alerts.
- Enable Dependabot security updates.
- Enable secret scanning and push protection if available for the repository.
- Review Dependabot pull requests weekly; do not auto-merge major updates.

### Supabase

- Keep Row Level Security enabled on user-owned tables.
- Review Auth rate limits in the Supabase dashboard.
- Do not expose service-role keys in web or mobile clients.
- Rotate keys if a secret is ever pushed publicly.

### Cloudflare optional layer

Cloudflare can sit in front of Vercel for DNS and extra network protection.
Use it only after the Vercel domain is stable.

Recommended free settings:

- Proxy `kampusraf.com` and `www.kampusraf.com` through Cloudflare.
- SSL/TLS mode: Full.
- Keep HTTP DDoS protection enabled.
- Add a WAF custom rule for obvious scanner paths if Vercel logs show repeated
  abuse.

## Free external checks

- securityheaders.com: verify security headers after deploy.
- Mozilla Observatory: run a second header/security check.
- Google Search Console: monitor indexed public pages and unexpected 404s.
- GitHub Dependabot alerts: track dependency vulnerabilities.

## Operational rules

- Never put Supabase service-role keys in `NEXT_PUBLIC_*` variables.
- Keep admin pages noindex and protected by server-side role checks.
- Prefer private disclosure for vulnerabilities; do not discuss exploit details
  in public issues.
- If rate limits block a real user flow, adjust the narrow route-specific limit
  instead of removing global protection.
