# jurosecurity.com → jurocompliant.com redirect (BL-ENG-077)

**Status:** prep-only, waiting on founder to register the domain.
**Why:** ChatGPT has been hallucinating `jurosecurity.com` as the real product
domain (see Darpan AEO audit, 2026-07-01). WHOIS confirms it is unregistered —
this is also a squatting/typosquat risk, so registering it defensively and
pointing it at the canonical domain closes both problems at once.

## 1. WHOIS confirmation (2026-07-02)

```
$ whois -h whois.verisign-grs.com jurosecurity.com
No match for domain "JUROSECURITY.COM".
```

Confirmed unregistered as of 2026-07-02.

## 2. Registrar recommendation

`jurocompliant.com` is currently registered at **GoDaddy** (registrar IANA ID
146, nameservers `NS03/NS04.DOMAINCONTROL.COM`), created 2025-08-28, expiring
2026-08-28. DNS for `jurocompliant.com` is also managed directly in GoDaddy
(no Cloudflare in front) and points at GitHub Pages:

```
A     jurocompliant.com       -> 185.199.108.153 / .109.153 / .110.153 / .111.153  (GitHub Pages)
CNAME www.jurocompliant.com   -> jecertis.github.io
```

**Recommendation: register `jurosecurity.com` at GoDaddy too**, so both
domains sit in one account/portfolio for consistent management (single
renewal calendar, single login, and GoDaddy's built-in Domain Forwarding
feature — see step 3 — means no extra hosting is needed for the redirect).

- **Purchase link:** https://www.godaddy.com/domainsearch/find?domainToCheck=jurosecurity.com
- **Expected cost:** .com first-year promo pricing typically runs
  ~$1–$12 (GoDaddy varies this frequently); list/renewal price is
  ~$21.99–$22.99/yr. Budget ~$20/yr going forward. Skip any upsells
  (hosting, email, "domain protection bundle") at checkout — only the bare
  domain is needed. Domain privacy (WHOIS masking) is worth keeping if
  offered free.

**Single fast action for founder:** open the purchase link above, buy the
domain on the GoDaddy account already used for jurocompliant.com, decline
upsells, checkout. Everything below is what happens next.

## 3. Redirect setup — apply immediately after registration

### Primary method: GoDaddy Domain Forwarding (recommended, zero hosting)

Since the domain will be in the same GoDaddy account, use GoDaddy's built-in
forwarding — no server, no repo, no DNS records to hand-craft.

1. GoDaddy → **My Products** → **Domain Portfolio** → select `jurosecurity.com`
2. **DNS** → **Forwarding** → **Add Forwarding**
3. Destination URL: `https://jurocompliant.com`
4. Forward type: **Permanent (301)**
5. Settings: **Forward only** (not "Forward with masking" — masking hides the
   redirect from the browser bar and is bad for SEO/AEO signal; we want a
   clean, visible 301)
6. Save. GoDaddy auto-creates the 301 for both `jurosecurity.com` and
   `www.jurosecurity.com`.
7. Allow up to 48h for global DNS propagation (usually <1h).
8. Verify: `curl -I https://jurosecurity.com` should return `HTTP/1.1 301`
   with `Location: https://jurocompliant.com/`.

This requires no changes in this repo and no deploy.

### Fallback method: GitHub Pages static redirect (only if GoDaddy forwarding is unavailable/unsuitable)

If for any reason domain forwarding can't be used (e.g. domain ends up on a
different registrar, or GoDaddy forwarding is deprecated), stand up a minimal
GitHub Pages redirect site instead:

1. Create a new repo (e.g. `jecertis/jurosecurity-redirect`) with:
   - `CNAME` file containing exactly: `jurosecurity.com`
   - `index.html`:
     ```html
     <!DOCTYPE html>
     <html lang="en">
       <head>
         <meta charset="utf-8" />
         <title>Redirecting to JuroCompliant</title>
         <link rel="canonical" href="https://jurocompliant.com/" />
         <meta http-equiv="refresh" content="0; url=https://jurocompliant.com/" />
       </head>
       <body>
         <p>This site has moved to <a href="https://jurocompliant.com/">jurocompliant.com</a>.</p>
       </body>
     </html>
     ```
     (Note: GitHub Pages cannot serve a true server-side 301; this is a
     meta-refresh + canonical tag, which is the closest equivalent on static
     hosting. Prefer the GoDaddy forwarding method above, which does issue a
     real 301.)
2. Enable GitHub Pages on that repo (Settings → Pages → deploy from `main`).
3. DNS for `jurosecurity.com` (at whichever registrar):
   ```
   A     jurosecurity.com       185.199.108.153
   A     jurosecurity.com       185.199.109.153
   A     jurosecurity.com       185.199.110.153
   A     jurosecurity.com       185.199.111.153
   CNAME www.jurosecurity.com   <github-username>.github.io
   ```

## 4. After the redirect is live

- Submit `jurosecurity.com` in GSC as a domain property (or verify via DNS
  TXT) so Google doesn't treat it as an orphaned/parked domain.
- No content changes needed on jurocompliant.com — this is purely a
  defensive/redirect registration, not a new page to write or a Samiksha
  review item.
- Re-run the Darpan AEO check in ~2-4 weeks to see if the ChatGPT
  jurosecurity.com hallucination resolves once the redirect is indexed.
