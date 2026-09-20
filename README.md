# Govgraph · Nigeria

A public knowledge graph of the Federal Republic of Nigeria. Ministries, seats, officeholders, and the legal edges that connect them (`appoints`, `confirms`, `elects`, `oversees`).

Modeled on [CivLab US Gov Graph](https://graph.civlab.org/us). Federal occupancy comes from the [State House cabinet list](https://statehouse.gov.ng/the-cabinet/). National Assembly occupancy comes from [nass.gov.ng](https://nass.gov.ng/mps/senators). Governors come from the Wikipedia current-governors table.

## Run

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000/ng](http://localhost:3000/ng).

Layers:

- **Federal** (default). Presidency, NASS, courts, MDAs, commissions.
- **States**. 36 states, Houses of Assembly, FCT.
- **All**. Both rings.

NASS district seats are first-class nodes. They stay off the default map. Open the Senate or House page for the roster.

## Data

Catalogs in `src/data/nigeria/` compile through `src/lib/graph/build-graph.ts`. `filterGraph` keeps the default map federal-only.

Refresh NASS occupancy from the official table:

```bash
npm run nass:refresh
npm run db:seed -- --live-nass
```

NASS occupancy is overlaid first. Wikipedia 10th Assembly lists fill remaining vacant Senate seats. House seats the NASS API never named stay vacant rather than guessed.

## Postgres

Neon holds the compiled snapshot and the civic feed (news and personnel changes). `loadNigeriaGraph` reads Neon first and falls back to the TypeScript catalogs.

```bash
vercel env pull .env.local --yes
npm run db:push
npm run db:seed
```

A Vercel cron hits `/api/cron/refresh` daily. It overlays live NASS occupancy, then writes the snapshot and feed. Set `CRON_SECRET` and send `Authorization: Bearer $CRON_SECRET`.
