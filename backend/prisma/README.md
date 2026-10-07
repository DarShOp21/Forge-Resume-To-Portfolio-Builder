# Wiring notes

## Why status isn't read from Trigger.dev anymore

Right now `getPortfolioStatus` calls `runs.retrieve(runId)` against
Trigger.dev's API on every single frontend poll. That works, but:

- every poll is an external network call (latency + a point of failure
  that isn't yours)
- there's no ownership - anyone with a `runId` can poll it, and there's no
  way to list "my runs" or show history
- Trigger.dev's own run object doesn't know about your users at all

With this schema, the `runs` table becomes the source of truth, and each
pipeline task updates it directly (it already runs server-side, so it can
just import your Prisma client). The frontend polls **your** API, which
reads Postgres - not Trigger.dev.

## Flow

1. `POST /auth/signup` / `POST /auth/login` (username **or** email +
   password) → issue an access token (short-lived JWT) + refresh token
   (row in `refresh_tokens`, only the hash stored).
2. `POST /api/portfolio/generate` (authenticated):
   - create the `Run` row first: `status: QUEUED`, `userId: req.user.id`
   - call `websiteTask.trigger({ runId: run.id, userId: req.user.id, prompt })`
   - `UPDATE runs SET triggerRunId = handle.id WHERE id = run.id`
   - respond `202 { runId: run.id, statusUrl: "/api/portfolio/status/" + run.id }`
     — note this is **our** `run.id`, not Trigger.dev's `handle.id`
3. Each task in `trigger/parent.ts` (architect, blueprint, html, css/js,
   validate, build, deploy) wraps its work with two small DB writes:

   ```ts
   await db.run.update({
     where: { id: payload.runId },
     data: { status: "RUNNING", stage: "ARCHITECTING", progressPercent: 10 },
   });
   await db.runEvent.create({
     data: { runId: payload.runId, stage: "ARCHITECTING", status: "started" },
   });
   // ... do the work ...
   await db.runEvent.create({
     data: { runId: payload.runId, stage: "ARCHITECTING", status: "succeeded" },
   });
   ```

   A suggested `progressPercent` mapping for the stepper/progress bar:

   | stage             | %   |
   |-------------------|-----|
   | EXTRACTING_TEXT   | 5   |
   | PARSING_RESUME    | 10  |
   | ARCHITECTING      | 20  |
   | BLUEPRINTING      | 35  |
   | GENERATING_HTML   | 50  |
   | GENERATING_CSS    | 65  |
   | GENERATING_JS     | 65  |
   | VALIDATING        | 80  |
   | BUILDING          | 90  |
   | DEPLOYING         | 95  |
   | COMPLETED         | 100 |

4. `GET /api/portfolio/status/:runId` (authenticated, and check
   `run.userId === req.user.id` so users can't poll each other's runs):

   ```ts
   const run = await db.run.findUniqueOrThrow({ where: { id: req.params.runId } });
   return res.json({
     status: run.status,
     stage: run.stage,
     progressPercent: run.progressPercent,
     deployedUrl: run.deployedUrl,
     errorMessage: run.errorMessage,
   });
   ```

   The frontend polls this every 1–2s and stops once `status` is
   `COMPLETED`, `FAILED`, or `CANCELED`.

5. On success, `deployTask` sets `deployedUrl`, `vercelDeploymentId`,
   `status: COMPLETED`, `completedAt: now()`. On failure, wrap the whole
   `websiteTask.run()` body in try/catch and set `status: FAILED`,
   `errorStage`, `errorMessage`.

## Migration

```bash
npm install prisma @prisma/client --save
npx prisma migrate dev --name init
```

`DATABASE_URL` goes in `.env` (not committed — see the missing
`.gitignore`/`.env.example` from the earlier review).
