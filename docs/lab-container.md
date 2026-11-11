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

Use a Cloudflare token scoped to cache purge for this zone. `CF_API_BASE` defaults to `https://api.cloudflare.com/client/v4/`; it is overridable for tests, with HTTP allowed only on loopback. The job persists using the existing `liveNass`, `wikiFill`, `portraits`, and `monitor` options, closes its database pool, resolves every Service A record, deduplicates addresses, and waits for every pod acknowledgement. Any persistence, DNS, or pod failure exits nonzero before purge. Only then does it request a zone-wide purge. An unsuccessful Cloudflare response also exits nonzero. Logs contain short, credential-redacted reasons, never full graph queries or stacks.

The refresh job needs DNS, Postgres, existing enrichment-source egress and Cloudflare HTTPS. The web workload needs DNS resolution and **Supabase Postgres only**. The lab build disables server image optimization and PostHog `/ingest` rewrites; browsers load portraits and contact PostHog directly. The network policy remains responsible for enforcement. Probes intentionally indicate process readiness rather than database health.

`LAB_BUILD=1` selects standalone output and these lab settings at build time. It is baked into the artifact; no runtime flag is needed. The default build preserves Vercel image optimization, the analytics proxy, and `/api/cron/refresh`. The lab variant rejects that legacy enrichment endpoint after authentication, keeping internet enrichment in the one-shot job. The revalidation endpoint only invalidates `ng-stored-data` with `{expire:0}`.

## Cold-start cache and filesystem

A build without `DATABASE_URL` uses the demo catalog in `store.ts`. Next can emit demo HTML during compilation. Serving those build entries for a day would violate this contract. The lab cache handler therefore reads **only pod-local entries under `.next/cache/lab`**, never the build's `.next/server` prerenders. Packaging also removes build-time cache files and any traced dotenv files. The emptyDir starts empty. The first web request regenerates HTML and compressed data from the runtime database; later requests reuse them for up to 86400 seconds or until the authenticated tag invalidation.

The handler stores page, route, data, and tag entries together using atomic renames and V8 serialization, preserving binary RSC/route content and segment maps. Memory caching is disabled. Each pod has its own cache, which is why the job must contact every A record. Runtime failures reject generation; they do not overwrite successful entries with demo data. Data expiry and cache misses still require the database. A missing runtime `DATABASE_URL` is a deployment misconfiguration: supply it through the web Secret.

Graph compilation and snapshot persistence are shared modules independent of the Next request-cache layer. The job bundles those modules rather than depending on untraced Next entry points. It uses the same persistence function as the Vercel cron route.

## Release pipeline

`.github/workflows/lab-release.yml` runs on pushes to `main` or manual dispatch. It builds locally, gates publication with Trivy for HIGH/CRITICAL vulnerabilities with fixes, generates a Syft SPDX JSON SBOM, pushes GHCR tags, resolves the pushed digest, then signs and attaches the SPDX attestation using keyless Cosign. Its action SHAs match the supplied personal-site workflow. Contents permission is read-only; package and OIDC writes are scoped to the release job. There is no database secret in CI. Public analytics settings use Actions variables, not secrets.

Both stages pin the official Node 24.21.0 bookworm-slim manifest by digest. The runtime contains traced production dependencies and the job bundles, removes root development packages and package-manager executables, and uses uid 1001. `.dockerignore` excludes credentials, local artifacts and investigation files.

## Verification record

Local verification uses Node 24.21.0. Docker is not installed on this Mac, so image construction, Linux UID execution, Trivy, SBOM publication and signing are **CI checks, not locally verified results**. No image was pushed and no deployment was made.

Commands used:

```sh
# Select a supported Node version first.
env -u DATABASE_URL LAB_BUILD=1 npm run build
node scripts/check-lab-runtime.mjs
node scripts/check-lab-refresh.mjs
npm run lint
npx tsc --noEmit
npm test
```

The lab config clears `DATABASE_URL` specifically during the production build, including any value Next loaded from a local dotenv file. Runtime proof loads the local `.env.local` value only into the child process environment and never prints it.

Build route summary: `/`, `/_not-found`, `/api/graph`, icons, `/ng`, `/ng/budget`, `/ng/elections`, `/ng/federal-character`, and `/opengraph-image` are marked static; entity, representative and topic patterns are SSG; `/api/graph/[version]`, `/api/cron/refresh`, `/api/revalidate`, and `/healthz` are dynamic. Data-bearing static routes show a one-day revalidation interval. Those build-time static entries do not seed the lab runtime cache.

The standalone proof copies the prepared artifact to an isolated temporary directory, imports the **actual** persistence adapter without a running Next server, then removes all write permission with `chmod` except `.next/cache`. It starts `node server.js` on port 3000 using the real local database. It asserts health leaves the data cache empty, `/ng`, the finance entity and the versioned graph return 200, the runtime graph digest differs from the no-database build catalog, and revalidation returns 401 without credentials and 200 with credentials. GET returns 405. A subsequent homepage request advances its persisted cache timestamp, proving tag invalidation regenerated the page. No EACCES, EROFS or failed-cache-write errors are accepted. Temporary permissions and files are restored/removed afterward.

That same proof runs **both existing regression scripts**. `check-page-cache.mjs` checks cached HTML, graph digests, cache headers, redirects, strict version rejection and absence of per-version ISR files. Its trending assertion now follows eligible current-week coverage, because an old stored feed legitimately has no trending card; it still verifies a topic summary in cached HTML. `check-regeneration-failure.mjs` accepts `LAB_CACHE_SEED` solely as a test fixture: it copies successful runtime cache entries, drops data entries in its isolated copy, and uses an unreachable database. Forced regeneration must return 500 while the prior page remains byte-identical at 200; invalid versions return tiny 404s before DB access and cold valid versions fail without immutable caching. The original Vercel test path remains available without this fixture.

The refresh proof executes the shipped orchestration bundle as `node refresh.mjs`, substituting its persistence adapter and DNS/address routing only at test boundaries. Two real local HTTP servers on **different ports** stand in for two pod IPs sharing service port 3000. A third server implements Cloudflare. It verifies authenticated requests, duplicate-address handling, all-pods-before-purge ordering, successful zone-wide purge, pod failure with **zero purge calls**, persistence failure with no pod/purge calls, and Cloudflare failure with a nonzero exit. The separate real-adapter import check catches packaging failures hidden by the persistence stub.

Final results are recorded after all commands complete below.

**Results, 2026-11-11:** no-DB lab build passed without warnings; actual packaged adapter import passed; read-only standalone proof with the real local Supabase database passed; both regression scripts passed; refresh CLI success and failure stubs passed; lint and `tsc --noEmit` passed; **170 tests passed, zero failures** (55 suites plus standalone tests). `git diff --check` passed. The sole whole-branch review blocker was the adapter's untraced Next cache import; extracting the shared pure compiler/database operations removed that dependency, and the new actual-adapter probe changed from failing to passing. No review findings were deferred.
