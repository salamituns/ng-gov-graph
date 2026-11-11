# Govgraph lab container

**Web command: `node start.mjs`, working directory `/app`, port `3000`, uid/gid `1001:1001`.**

**Writable mounts: `/app/.next/cache` and `/app/.next/server/route-cache`, each an `emptyDir`. All other paths remain read-only.** Set `readOnlyRootFilesystem: true` and `fsGroup: 1001`. Suggested size limits are **128Mi** and **2Gi**, respectively. Do not mount over `.next/server/app`, which contains compiled modules.

## Startup and caching

The app uses **Next 16.4.6's default filesystem cache**, with its default bounded memory cache. There is no custom cache handler. `start.mjs` empties the contents of both writable mount roots before requiring `server.js`; it preserves the mount roots and permissions. A container/process restart therefore cannot retain filesystem entries after losing the corresponding in-memory invalidation tags. **The refresh job needs no writable path**, including no `.next/cache` mount and no `/tmp` mount; it runs `node refresh.mjs` directly and does not use start.mjs. No shell or init-container copy step is needed. Run one web process per pod and use this entrypoint on every production start.

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
| Refresh job configuration | `REVALIDATE_HOST`, `REVALIDATE_PORT=3000`, `REVALIDATE_SETTLE_MS=10000` |
| Refresh job command | `node refresh.mjs`, same image and `/app` working directory |
| Health probes | `GET /healthz`, HTTP 200, body `ok`, no database calls |
| Revalidation | Authenticated POST: 200 `{"ok":true}` after completion; 401 without the correct secret; GET 405 |

**The revalidation headless Service must set `publishNotReadyAddresses: true`.** DNS must include briefly NotReady pods so they cannot later rejoin with stale entries. The job persists with the existing `liveNass`, `wikiFill`, `portraits`, and `monitor` options, closes its DB pool, resolves every A record and deduplicates addresses. The same address snapshot is used throughout this sequence:

1. Revalidate every pod and require every acknowledgement.
2. Wait **`REVALIDATE_SETTLE_MS`**, default **10000 ms**.
3. Revalidate every pod a second time and again require every acknowledgement.
4. Request exactly one zone-wide Cloudflare purge.
5. Warm every pod's `/ng` page and the versioned graph URL found in that page, using GET requests to its captured IP. **Best effort:** failures are logged with a short reason per pod and the job still exits 0.

The second round expires cache entries written by renders that read the old snapshot before round one and completed during the settle interval. **Configure the settle delay longer than the longest possible render**, including DB latency; 10 seconds is the default, not a guarantee against arbitrarily slow renders. The setting accepts nonnegative integer milliseconds up to the Node timer limit; short values/zero are for tests, not the production race guard. Job deadlines must cover persistence, the settle interval, both rounds and warmup. Each round logs its pod count. Persistence, DNS or a failure in either round means **no purge and no warmup**. Cloudflare failure exits nonzero without warming. A warmup failure is logged as a warning (one redacted reason per pod) and the job still exits 0. Why the asymmetry: any nonzero exit makes the Job retry from the start (with `restartPolicy: OnFailure` or `Never`, up to `backoffLimit`). A retry **before** the purge is harmless, because persistence writes the same snapshot and nothing user-visible happened yet. A retry **after** a successful purge would purge the edge again for no gain. Because a fully failed warm-up still ends in a Succeeded Job, Job-failure alerts do not cover it: a DB outage right after the purge surfaces through the outside probe and 5xx alerts, not the Job status. Logs use short redacted reasons.

`CF_API_BASE` defaults to `https://api.cloudflare.com/client/v4/` and is overridable for tests; HTTP is allowed only on loopback. Scope the Cloudflare token to cache purge for this zone. The job needs DNS, database, existing enrichment sources and Cloudflare egress. The web needs DNS and Supabase Postgres only. Browsers load portraits and contact PostHog directly. The default Vercel build retains optimized images, the ingestion proxy and the cron refresh route. In the lab build, that legacy enrichment endpoint rejects requests after authentication; enrichment runs in the job.

## Storage sizing

A full crawl rendered **all 975 distinct entity routes**, with four concurrent requests, against the read-only standalone and the real local database. After the crawl, `.next/server/route-cache` contained **6,841 files**, **157,782,875 bytes of content (150.47 MiB)** and **171,474,944 allocated bytes (163.53 MiB)** on the Mac filesystem. The measurement includes routes warmed by the regression checks as well as entity HTML, RSC, segment and metadata files. Linux filesystem allocation can differ; repeat the crawl as the graph grows.

Recommend route-cache `sizeLimit = max(2Gi, roundUpMiB(2 × measured allocated size))`. Twice this measurement is **342,949,888 bytes (327.06 MiB)**, so use **`sizeLimit: 2Gi`**. Keep **`128Mi`** for `.next/cache`. Reproduce the measurement with `CRAWL_ALL_ENTITIES=1 node scripts/check-lab-runtime.mjs`. Regeneration overwrites route keys; the dynamic versioned graph route does not create per-version ISR entries, which the regression check verifies in both compiled and native cache outputs.

**Exceeding a disk-backed emptyDir sizeLimit causes the kubelet to EVICT the pod once it observes the excess.** It is not a filesystem quota that merely turns the next cache write into a failed write. Kubelet storage isolation/accounting must be enabled, and scans are periodic, so usage can temporarily exceed the limit before eviction. Budget the pod's overall ephemeral-storage request/limit for both cache volumes and logs, and monitor usage and eviction events. See the [Kubernetes project's local ephemeral storage documentation](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/#ephemeral-storage-consumption-management) (n.d.). Startup clears both volumes every time the process starts.

## Accepted availability risks

A **database outage exactly at refresh can leave the pre-refresh page cached at the edge for up to one day**, particularly when persistence or a revalidation fails and the job correctly skips the purge. This accepts stale edge content rather than purging into an unavailable origin. If the purge already succeeded before warmup hits a DB outage, the purge cannot be reversed and cold origin requests may fail until the DB recovers.

A **restarted pod needs the database for its first data-bearing requests**, because start.mjs deliberately clears both caches along with the lost in-memory tags. The health endpoint can still return 200 while the database is unavailable. These are accepted tradeoffs of the process-local default cache and its daily edge TTL.

## Image and CI

Both stages pin `node:24-bookworm-slim` to manifest digest `sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54` (Node **24.22.3**, image config created 2026-11-11). The downloaded amd64 base-layer package database contains apt/libapt **2.6.2** and perl-base **5.36.0-7+deb12u4**, the fixed versions flagged in the earlier scan. There is **no runtime apt upgrade**. The lockfile retains Next/eslint-config-next 16.4.6 and sharp 0.35.5. The runtime uses traced production dependencies, removes development packages and npm/yarn executables, and runs non-root. Credentials and local investigation files are excluded from the Docker context and packaged runtime.

`.github/workflows/lab-release.yml` retains the main push and manual-dispatch identity used by the promoter and adds PR validation. Both event paths call **one shared composite action**, `.github/actions/lab-image/action.yml`, containing the image build and unchanged Trivy HIGH/CRITICAL-with-fixes gate. PR images use **`pr-<number>`**, never `:main`, and the PR job has only contents-read permission. The main release job alone receives package/OIDC write permission. SBOM generation, login, push, keyless signing and SPDX attestation each require main and a non-PR event. A composite action keeps signing in the caller's `lab-release.yml@refs/heads/main` identity. Action references remain SHA-pinned.

The Mac has no Docker. Local standalone proofs establish application behavior and the two writable paths; GitHub Actions builds and scans the full Linux image. Registry publication and signing occur only on main. No image was published and no deployment was made during this work.

## Verification

Commands, with supported Node 24 selected:

```sh
env -u DATABASE_URL LAB_BUILD=1 npm run build
CRAWL_ALL_ENTITIES=1 node scripts/check-lab-runtime.mjs
node scripts/check-lab-refresh.mjs
npm run lint
npx tsc --noEmit
npm test
actionlint
```

The no-DB build succeeds. Its route table marks `/api/graph/[version]`, cron refresh, revalidation and health dynamic; `/ng`, the legacy graph and fixed data pages have one-day revalidation; entity/representative/topic patterns are SSG. Packaging deletes the data-bearing prerender outputs regardless of that build classification.

The read-only proof copies the prepared artifact, plants old files in both writable roots, applies `chmod -R a-w` except those roots, then starts **`node start.mjs` on port 3000**. Health returns `ok` with both caches empty. Using the local real database without printing credentials, home/entity/graph return 200 and the runtime graph digest differs from the no-DB catalog. An actual packaged refresh-adapter import succeeds. Delaying native tag invalidation blocks 200, releasing it lets the next request regenerate, and a handler failure returns 503. Restarting the same artifact with populated cache directories clears both before readiness and regenerates successfully.

That same proof runs both regression scripts against the actual lab artifact. The page check verifies lean cached HTML, per-page weekly coverage dates, a topic chosen from the trending card, cache headers, graph digests, redirects, malformed versions and absence of per-version cache files. The regeneration-failure check copies a warmed artifact and starts its **server.js directly solely to inject an outage while retaining the successful cache fixture**. Production starts always use start.mjs. The isolated process uses an unreachable DB, clears only its data cache, requires forced regeneration to fail with 500, and requires the previous page to remain byte-identical at 200. It requests `/opengraph-image` and `/icon.svg` twice, verifies HIT responses and identical bytes, and checks that native cache-body files are not rewritten on hits. Malformed graph versions return tiny 404s before DB access; cold valid versions fail without immutable caching.

The refresh proof runs the shipped CLI from a directory made read-only, with Node's permission model allowing filesystem reads and **no filesystem writes anywhere**. Guard self-tests confirm that writes to `.next/cache` and `/tmp` are denied. With persistence and DNS/address routing stubbed at test boundaries, two real pod servers on different ports and one fake Cloudflare endpoint verify both rounds for each pod, a real configured settle delay, exactly one purge after round two, and homepage/graph warmup only after that purge. A round-two failure must attempt both pods and produce zero purge calls. It also covers round-one, persistence and purge failures (nonzero, no warmup) and a post-purge warmup failure on one pod (warning, exit 0). The unit test `warm-up failures are logged with reasons…` covers a 500, a page with no graph URL and a healthy pod together: exactly one purge, the healthy pod still warmed, and both reasons in the warning. The default 10000 ms delay is asserted by a unit test without actually sleeping for ten seconds.

The actual bundled persistence adapter is also loaded and exercised under the same write denial, with empty NASS data, other enrichment fetches failing closed, and an unreachable local DB. It reaches the expected DB connection failure without filesystem writes or production mutations. A successful live persistence run was not performed against production; the successful orchestration proof stubs that boundary. Source inspection of the persistence/enrichment path found no filesystem-write dependency. The refresh job therefore requires **no writable mounts**, while the web entrypoint still needs the two documented mounts. A startup test separately verifies both cache directories are emptied before the server loads while compiled modules are preserved.

**R4 verification:** no-DB lab build passed; read-only standalone/restart proofs and both regression scripts passed; all 975 entity routes rendered and were measured; the read-only refresh proof passed, including round-two failure and no purge; lint, typecheck, actionlint and **171 tests** passed with zero failures. The new ordering unit test failed against the one-round implementation before the fix and passed afterward. `git diff --check` passed. The completion report records the pushed commit and final PR image-build result, with a maximum twenty-minute CI wait.

Reference audit for the storage citation: publisher/author **Kubernetes project: CERTAIN**; supporting URL **CERTAIN**; original publication date **UNCERTAIN**, recorded as **n.d.**. No author or publication date was invented.
