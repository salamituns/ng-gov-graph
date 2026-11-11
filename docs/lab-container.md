# Govgraph lab container

## Cluster contract

The image is `ghcr.io/<repository-owner>/govgraph:<commit>` (also tagged `main`). The web command is `node server.js` in `/app`, listening on port **3000**, as **1001:1001**. Set `readOnlyRootFilesystem: true` and mount one writable `emptyDir` at **`/app/.next/cache`**, with pod `fsGroup: 1001`. There are no other application writable paths. Do not mount over `/app/.next` or the server/static artifacts disappear. No shell command is required to start either workload.

| Workload | Configuration |
|---|---|
| Web, runtime secrets | `DATABASE_URL` (Supabase transaction pooler), `CRON_SECRET` |
| Build, public GitHub Actions variables | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (default `https://us.i.posthog.com`) |
| Job, runtime secrets | `DATABASE_URL`, `CRON_SECRET`, `CF_ZONE_ID`, `CF_API_TOKEN` |
| Job, runtime configuration | `REVALIDATE_HOST` (headless web Service), `REVALIDATE_PORT=3000` |
| Job command | `node refresh.mjs`, same image and working directory; one-shot, nonzero on failure |
| Probes | `GET /healthz`, HTTP 200, body `ok`; no database dependency |
| Invalidation | `POST /api/revalidate` with `Authorization: Bearer <CRON_SECRET>`; 200 `{"ok":true}`, otherwise 401; GET is 405 |

**The revalidation headless Service must set `publishNotReadyAddresses: true`.** Without it, DNS omits briefly NotReady pods, which could later rejoin with stale data. The job logs `revalidated N pods`; it still requires every returned address to acknowledge successfully.

Use a Cloudflare token scoped to cache purge for this zone. `CF_API_BASE` defaults to `https://api.cloudflare.com/client/v4/`; it is overridable for tests, with HTTP allowed only on loopback. The job persists using the existing `liveNass`, `wikiFill`, `portraits`, and `monitor` options, closes its database pool, resolves every Service A record, deduplicates addresses, and waits for every pod acknowledgement. Any persistence, DNS, or pod failure exits nonzero before purge. Only then does it request a zone-wide purge. An unsuccessful Cloudflare response also exits nonzero. Logs contain short, credential-redacted reasons, never full graph queries or stacks.

The refresh job needs DNS, Postgres, existing enrichment-source egress and Cloudflare HTTPS. The web workload needs DNS resolution and **Supabase Postgres only**. The lab build disables server image optimization and PostHog `/ingest` rewrites; browsers load portraits and contact PostHog directly. The network policy remains responsible for enforcement. Probes intentionally indicate process readiness rather than database health.

`LAB_BUILD=1` selects standalone output and these lab settings at build time. It is baked into the artifact; no runtime flag is needed. The default build preserves Vercel image optimization, the analytics proxy, and `/api/cron/refresh`. The lab variant rejects that legacy enrichment endpoint after authentication, keeping internet enrichment in the one-shot job. The revalidation endpoint only invalidates `ng-stored-data` with `{expire:0}`.

## Cold-start cache and filesystem

A build without `DATABASE_URL` uses the demo catalog in `store.ts`. Next can emit demo HTML during compilation. Serving those build entries for a day would violate this contract. The lab cache handler therefore reads **only pod-local entries under `.next/cache/lab`**, never the build's `.next/server` prerenders. Packaging also removes build-time cache files and any traced dotenv files. The emptyDir starts empty. The first web request regenerates HTML and compressed data from the runtime database; later requests reuse them for up to 86400 seconds or until the authenticated tag invalidation.

Removing the handler was tested first on Next 16.3.5. Deleting `/ng*` and `/api/graph` prerender `.html`/`.rsc`/`.meta`/`.body` outputs allowed on-demand generation, but the default filesystem cache then failed with EACCES writing `.next/server/app/ng.meta`. The default handler also keeps invalidation tags only in memory. Mounting `.next/server/app` as an emptyDir would hide compiled application modules. The retained handler avoids adding writable code directories. `node scripts/probe-default-lab-cache.mjs` reproduces the write failure on the patched Next version, whose output paths are now scoped under `.next/server/app/route-cache/`. The writable contract remains **only `/app/.next/cache`**.

The handler stores page, route and data entries with V8 serialization, preserving binary RSC/route content and segment maps. A single manifest contains invalidation timestamps and an LRU index. Every mutation is serialized; file content is synced, renamed atomically, and the containing directory is synced before acknowledgement. The manifest is loaded once per process. Tags stay in memory; hot entries share an **8 MiB deserialized LRU**, so repeated hits do not deserialize the full entry or read individual tag files. Disk entries are capped at **256 entries and 64 MiB**, plus the bounded manifest and one atomic temporary file. Evictions occur before writing a replacement; restart recovery removes unindexed blobs and interrupted temporary files. Next's additional default memory cache remains disabled.

Entries record the request's **generation start**, rather than `set()` completion. HTML carries `govgraph-rendered-at`; the legacy graph route carries `x-govgraph-rendered-at`; data entries use Next's request context. Late old renders cannot overwrite newer entries, and an entry whose generation predates invalidation stays expired. Expired data reads block for fresh database data. Expired HTML remains available as stale while ISR regenerates, with **`Cache-Control: no-store`** so a post-purge fallback cannot refill Cloudflare for a day. Failed regeneration retains the last good HTML. Once regeneration succeeds, normal public cache headers resume. A cold cache still needs a working database.

`POST /api/revalidate` calls `revalidateTag` with `{expire:0}`, explicitly awaits Next's queued revalidations, and clears the completed queue before returning 200. A failed durable write returns **503**, so the refresh job cannot purge. Next 16.4.6 is pinned because request-start metadata and the queue flush use its internal APIs; runtime tests must accompany future upgrades. A missing runtime `DATABASE_URL` is a deployment misconfiguration: supply it through the web Secret.

Graph compilation and snapshot persistence are shared modules independent of the Next request-cache layer. The job bundles those modules rather than depending on untraced Next entry points. It uses the same persistence function as the Vercel cron route.

## Release pipeline

`.github/workflows/lab-release.yml` builds and scans images on every pull request with contents-read permission and no registry login, push, OIDC grant or signing. The separate publication job runs only when `github.ref == refs/heads/main`, for a main push or manual dispatch from main. It builds locally, gates publication with Trivy for HIGH/CRITICAL vulnerabilities with fixes, generates a Syft SPDX JSON SBOM, pushes GHCR tags, resolves the pushed digest, then signs and attaches the SPDX attestation using keyless Cosign. Its action SHAs match the supplied personal-site workflow. Contents permission is read-only; package and OIDC writes are scoped to the release job. Manual dispatch from another branch cannot publish or sign `:main`. There is no database secret in CI. Public analytics settings use Actions variables, not secrets.

The first PR image build succeeded, but its Trivy gate failed on fixable Next, sharp and Debian package vulnerabilities. The dependency lock now pins Next and eslint-config-next to **16.4.6** and sharp to **0.35.5**. The runtime stage upgrades Debian packages from its configured repositories before the unchanged vulnerability gate; findings are not suppressed.

Both stages pin the official Node 24.21.0 bookworm-slim manifest by digest. The runtime contains traced production dependencies and the job bundles, removes root development packages and package-manager executables, and uses uid 1001. `.dockerignore` excludes credentials, local artifacts and investigation files.

## Verification record

Local verification uses Node 24.21.0. Docker is not installed on this Mac. Image construction and Trivy are verified in the PR workflow; Linux UID execution is specified by the Dockerfile and remains a cluster check. SBOM publication and signing run only after a main-branch release. No image was published and no deployment was made during this work.

Commands used:

```sh
# Select a supported Node version first.
env -u DATABASE_URL LAB_BUILD=1 npm run build
node scripts/check-lab-runtime.mjs
node scripts/probe-default-lab-cache.mjs
node scripts/check-lab-refresh.mjs
npm run lint
npx tsc --noEmit
npm test
```

The lab config clears `DATABASE_URL` specifically during the production build, including any value Next loaded from a local dotenv file. Runtime proof loads the local `.env.local` value only into the child process environment and never prints it.

Build route summary: `/`, `/_not-found`, `/api/graph`, icons, `/ng`, `/ng/budget`, `/ng/elections`, `/ng/federal-character`, and `/opengraph-image` are marked static; entity, representative and topic patterns are SSG; `/api/graph/[version]`, `/api/cron/refresh`, `/api/revalidate`, and `/healthz` are dynamic. Data-bearing static routes show a one-day revalidation interval. Those build-time static entries do not seed the lab runtime cache.

The standalone proof copies the prepared artifact to an isolated temporary directory, imports the **actual** persistence adapter without a running Next server, then removes all write permission with `chmod` except `.next/cache`. It starts `node server.js` on port 3000 using the real local database. It asserts health leaves the data cache empty, `/ng`, the finance entity and the versioned graph return 200, the runtime graph digest differs from the no-database build catalog, and revalidation returns 401 without credentials and 200 with credentials. GET returns 405. A blocked manifest rename holds the invalidation response open; releasing it gives 200 with the tag timestamp already on disk. Making the cache directory read-only causes 503. A subsequent homepage regeneration advances its persisted generation timestamp. Unexpected EACCES, EROFS or failed-cache-write errors are rejected before the deliberate failure injection. Temporary permissions and files are restored/removed afterward.

That same proof runs **both existing regression scripts**. `check-page-cache.mjs` checks cached HTML, graph digests, cache headers, redirects, strict version rejection and absence of per-version ISR files. Its trending assertion uses the HTML render timestamp rather than the test clock. It chooses a topic from the rendered links or the topic catalog, with no hardcoded topic URL. It waits for transient stale/no-store responses to regenerate before checking normal public cache headers. `check-regeneration-failure.mjs` accepts `LAB_RUNTIME_ARTIFACT` solely as a test fixture. It copies the actual warmed standalone artifact, verifies its baked lab configuration and populated cache, and starts **`node server.js`**, with no dependency on a `LAB_BUILD` environment flag or `next start`. It uses an unreachable database and calls the authenticated invalidation endpoint. Tag-expired HTML must remain byte-identical at 200 and must be no-store; forced regeneration must fail with 500; invalid versions must return tiny 404s before DB access and cold valid versions must fail without immutable caching. The original Vercel `next start` test path remains available without the artifact fixture.

The refresh proof executes the shipped orchestration bundle as `node refresh.mjs`, substituting its persistence adapter and DNS/address routing only at test boundaries. Two real local HTTP servers on **different ports** stand in for two pod IPs sharing service port 3000. A third server implements Cloudflare. It verifies authenticated requests, duplicate-address handling, all-pods-before-purge ordering, successful zone-wide purge, pod failure with **zero purge calls**, persistence failure with no pod/purge calls, and Cloudflare failure with a nonzero exit. The separate real-adapter import check catches packaging failures hidden by the persistence stub.

## Review follow-up results

New cache contract tests were first run against the original handler. They failed for missing stale fallback, late renders stamped as fresh, and hot reads still depending on disk. They pass with the replacement implementation. Additional tests cover failed durable writes, Next data-generation timestamps, and tag invalidation surviving a separate-process restart.

Local results on the patched dependencies: no-DB lab build passed; actual packaged adapter import passed; read-only standalone proof with real local Supabase passed; both regression scripts passed against that actual artifact; refresh CLI success/failure stubs passed; lint, `tsc --noEmit` and **174 tests** passed. No credentials were printed. The image-build/scan result is tracked by the **PR image build** check on PR #76; publication is skipped for that PR. The completion report records the final run and commit identifiers. Vercel's separate check remains blocked by the owner's account status and does not run the lab image build.
