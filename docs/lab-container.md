# Govgraph lab container

**Web command: `node start.mjs`, working directory `/app`, port `3000`, uid/gid `1001:1001`.**

**Writable mounts: `/app/.next/cache` and `/app/.next/server/route-cache`, each an `emptyDir`. All other paths remain read-only.** Set `readOnlyRootFilesystem: true` and `fsGroup: 1001`. Suggested size limits are **128Mi** and **1Gi**, respectively. Do not mount over `.next/server/app`, which contains compiled modules.

## Startup and caching

The app uses **Next 16.4.6's default filesystem cache**, with its default bounded memory cache. There is no custom cache handler. `start.mjs` empties the contents of both writable mount roots before requiring `server.js`; it preserves the mount roots and permissions. A container/process restart therefore cannot retain filesystem entries after losing the corresponding in-memory invalidation tags. No shell or init-container copy step is needed. Run one web process per pod and use this entrypoint on every production start.

CI has no database credentials. `LAB_BUILD=1` selects standalone output, disables server image optimization and the PostHog ingestion rewrite, and clears `DATABASE_URL` during the production build, including a value loaded from local dotenv. Packaging removes both build caches and all data-bearing `/ng*` and `/api/graph` `.html`, `.rsc`, `.meta`, and `.body` prerenders. Compiled route modules and static metadata prerenders remain. The first data-bearing request generates from the runtime database rather than serving the build's demo catalog for a day.

Empirical read-only testing confirms that Next writes fetch data under `.next/cache/fetch-cache` and generated/promoted page and route entries under `.next/server/route-cache`. HTML, RSC, metadata, graph responses, icons and the Open Graph image work with only those two writable roots. No application writes were required elsewhere. The previous render-generation stamps and custom cache tests were removed. Only homepage/topic render-time metadata remains for verifying weekly news coverage against each page's own render time; missing Next request context throws.

`POST /api/revalidate` authenticates a Bearer `CRON_SECRET`, calls `revalidateTag('ng-stored-data', {expire:0})`, explicitly awaits Next's queued revalidations, and then returns 200 JSON. Errors return **503**. The native tags are process-local by design. This is a completed-invalidation acknowledgement, not a durable tag journal. A delayed-handler probe proves that 200 waits; the next request regenerates the homepage and updates its on-disk HTML. A simulated native-handler failure returns 503, so the refresh job cannot purge.

Next owns stale handling, retry backoff, serialization and seed promotion. A failed forced regeneration preserves a previously successful page. Immediate tag expiration is blocking: if the database fails immediately after a tag invalidation, that request can fail until regeneration succeeds. The proof no longer claims stale fallback after immediate tag expiry. Cold starts also require the database for data-bearing pages. `/healthz` remains independent of it.

## Runtime configuration

| Workload | Configuration |
|---|---|
| Web secrets | `DATABASE_URL` (Supabase transaction pooler), `CRON_SECRET` |
| Public build-time Actions variables | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (default `https://us.i.posthog.com`) |
| Refresh job secrets | `DATABASE_URL`, `CRON_SECRET`, `CF_ZONE_ID`, `CF_API_TOKEN` |
| Refresh job configuration | `REVALIDATE_HOST`, `REVALIDATE_PORT=3000` |
| Refresh job command | `node refresh.mjs`, same image and `/app` working directory |
| Health probes | `GET /healthz`, HTTP 200, body `ok`, no database calls |
| Revalidation | Authenticated POST: 200 `{"ok":true}` after completion; 401 without the correct secret; GET 405 |

**The revalidation headless Service must set `publishNotReadyAddresses: true`.** DNS must include briefly NotReady pods so they cannot later rejoin with stale entries. The job persists with the existing `liveNass`, `wikiFill`, `portraits`, and `monitor` options, closes its DB pool, resolves every A record, deduplicates addresses, and waits for every pod acknowledgement. It logs `revalidated N pods`. Only after every pod succeeds does it request a zone-wide Cloudflare purge. Persistence, DNS or pod failure means no purge; Cloudflare failure also exits nonzero. Logs use short redacted reasons.

`CF_API_BASE` defaults to `https://api.cloudflare.com/client/v4/` and is overridable for tests; HTTP is allowed only on loopback. Scope the Cloudflare token to cache purge for this zone. The job needs DNS, database, existing enrichment sources and Cloudflare egress. The web needs DNS and Supabase Postgres only. Browsers load portraits and contact PostHog directly. The default Vercel build retains optimized images, the ingestion proxy and the cron refresh route. In the lab build, that legacy enrichment endpoint rejects requests after authentication; enrichment runs in the job.

## Storage sizing

The runtime graph exposes **975 distinct entity routes**. The sampled finance route's HTML, RSC and metadata total **139,301 bytes**. Using **256 KiB per entity** gives **255,590,400 bytes (243.75 MiB)** for entities, before the smaller fixed routes and metadata images. This is an estimate, not a full crawl. A **1Gi route-cache emptyDir** provides roughly four times that entity estimate; **128Mi for `.next/cache`** provides ample headroom for the small set of compressed data entries. Revisit the estimate as the graph grows.

Regeneration overwrites a route's key, rather than creating a file for every refresh. The versioned graph route is dynamic and does not create per-version ISR entries; the regression check inspects both compiled outputs and the native cache subtree owned by that route. Size limits provide an enforced bound for unexpected route traffic as well as normal growth. Filling a volume can prevent cache writes, so monitor volume usage and error logs. Startup clears both volumes every time the process starts.

## Image and CI

Both stages pin `node:24-bookworm-slim` to manifest digest `sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54` (Node **24.22.3**, image config created 2026-11-11). The downloaded amd64 base-layer package database contains apt/libapt **2.6.2** and perl-base **5.36.0-7+deb12u4**, the fixed versions flagged in the earlier scan. There is **no runtime apt upgrade**. The lockfile retains Next/eslint-config-next 16.4.6 and sharp 0.35.5. The runtime uses traced production dependencies, removes development packages and npm/yarn executables, and runs non-root. Credentials and local investigation files are excluded from the Docker context and packaged runtime.

`.github/workflows/lab-release.yml` retains the main push and manual-dispatch identity used by the promoter and adds PR validation. Both event paths call **one shared composite action**, `.github/actions/lab-image/action.yml`, containing the image build and unchanged Trivy HIGH/CRITICAL-with-fixes gate. PR images use **`pr-<number>`**, never `:main`, and the PR job has only contents-read permission. The main release job alone receives package/OIDC write permission. SBOM generation, login, push, keyless signing and SPDX attestation each require main and a non-PR event. A composite action keeps signing in the caller's `lab-release.yml@refs/heads/main` identity. Action references remain SHA-pinned.

The Mac has no Docker. Local standalone proofs establish application behavior and the two writable paths; GitHub Actions builds and scans the full Linux image. Registry publication and signing occur only on main. No image was published and no deployment was made during this work.

## Verification

Commands, with supported Node 24 selected:

```sh
env -u DATABASE_URL LAB_BUILD=1 npm run build
node scripts/check-lab-runtime.mjs
node scripts/check-lab-refresh.mjs
npm run lint
npx tsc --noEmit
npm test
actionlint
```

The no-DB build succeeds. Its route table marks `/api/graph/[version]`, cron refresh, revalidation and health dynamic; `/ng`, the legacy graph and fixed data pages have one-day revalidation; entity/representative/topic patterns are SSG. Packaging deletes the data-bearing prerender outputs regardless of that build classification.

The read-only proof copies the prepared artifact, plants old files in both writable roots, applies `chmod -R a-w` except those roots, then starts **`node start.mjs` on port 3000**. Health returns `ok` with both caches empty. Using the local real database without printing credentials, home/entity/graph return 200 and the runtime graph digest differs from the no-DB catalog. An actual packaged refresh-adapter import succeeds. Delaying native tag invalidation blocks 200, releasing it lets the next request regenerate, and a handler failure returns 503. Restarting the same artifact with populated cache directories clears both before readiness and regenerates successfully.

That same proof runs both regression scripts against the actual lab artifact. The page check verifies lean cached HTML, per-page weekly coverage dates, a topic chosen from the trending card, cache headers, graph digests, redirects, malformed versions and absence of per-version cache files. The regeneration-failure check copies a warmed artifact and starts its **server.js directly solely to inject an outage while retaining the successful cache fixture**. Production starts always use start.mjs. The isolated process uses an unreachable DB, clears only its data cache, requires forced regeneration to fail with 500, and requires the previous page to remain byte-identical at 200. It requests `/opengraph-image` and `/icon.svg` twice, verifies HIT responses and identical bytes, and checks that native cache-body files are not rewritten on hits. Malformed graph versions return tiny 404s before DB access; cold valid versions fail without immutable caching.

The refresh proof runs the shipped CLI with persistence and DNS/address routing stubbed at test boundaries: two real pod servers on different ports and a fake Cloudflare endpoint. It covers all-pods-before-purge ordering, deduplication, no purge on persistence/pod failure, and nonzero exit on Cloudflare failure. A startup test separately verifies both cache directories are emptied before the server loads while compiled modules are preserved.

**Local results, 2026-11-11:** no-DB build passed; read-only standalone and restart proofs passed with only the two documented writable paths; both regression scripts passed against the actual artifact, including metadata caching; refresh proof passed; lint, typecheck and actionlint passed; **170 tests passed with zero failures**. `git diff --check` passed. The newer base's Debian package scan reports zero fixable HIGH/CRITICAL findings. Its raw npm distribution has findings, but npm is removed by the Dockerfile; a supplementary base scan excluding precisely those removed npm/yarn directories reports zero fixable HIGH/CRITICAL findings. No exclusions were added to the actual CI gate.

**CI result:** implementation commit `a3afbaa` passed the PR image build and Trivy gate in run **43100330983**; the release job was skipped. This validates the actual new Linux image, not just the supplementary base scan. The completion report includes the final documentation/proof commit and its run status. During the GitHub Actions outage noted in review, monitoring is capped at approximately twenty minutes per final run; queued status is reported without claiming success if that limit is reached.
