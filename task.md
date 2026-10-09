# Exam Code Execution Engine — `task.md`

> **Project:** `exam-code-executor`
> **Type:** Stateless, secure, independently deployable microservice
> **Stack:** Node.js · Express · Docker · JavaScript

---

## Architecture at a Glance

```
Existing Exam Backend
        │
        │  POST /api/v1/execute
        │  Authorization: Bearer <API_KEY>
        ▼
┌─────────────────────────────────────────┐
│           exam-code-executor            │
│                                         │
│  Auth MW → Validation → Queue           │
│  Execution Service                      │
│    ├─ Parser                            │
│    ├─ Language Adapter                  │
│    ├─ Compilation Cache (SHA-256)       │
│    ├─ Workspace Manager                 │
│    ├─ Docker Service                    │
│    ├─ Comparison Service                │
│    └─ Result Service                    │
└─────────────────────────────────────────┘
        │
        ▼
  Docker Sandbox Containers
  ┌──────┬──────┬──────┐
  │  Py  │ C++  │ Java │
  └──────┴──────┴──────┘
```

**Rule:** Executor is deliberately stateless — no MongoDB, no users, no exams, no scoring.
**Host Security:** The host running the Executor Node.js process has access to the Docker Socket. It must be explicitly isolated from public internet traffic; only the Existing Exam Backend should be able to reach it.

---

## Final File Structure

```
exam-code-executor/
│
├── src/
│   ├── server.js
│   ├── app.js
│   │
│   ├── config/
│   │   └── env.js
│   │
│   ├── routes/
│   │   ├── execution.routes.js
│   │   ├── health.routes.js
│   │   └── language.routes.js
│   │
│   ├── controllers/
│   │   └── execution.controller.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── errorHandler.js
│   │
│   ├── services/
│   │   ├── execution.service.js
│   │   ├── compilation-cache.service.js
│   │   ├── docker.service.js
│   │   ├── workspace.service.js
│   │   ├── queue.service.js
│   │   ├── comparison.service.js
│   │   └── result.service.js
│   │
│   ├── languages/
│   │   ├── index.js
│   │   ├── python/
│   │   │   ├── adapter.js
│   │   │   ├── runner.js
│   │   │   └── config.js
│   │   ├── cpp/
│   │   │   ├── adapter.js
│   │   │   ├── runner.js
│   │   │   └── config.js
│   │   └── java/
│   │       ├── adapter.js
│   │       ├── runner.js
│   │       └── config.js
│   │
│   ├── parsers/
│   │   ├── primitive.js
│   │   ├── array.js
│   │   ├── matrix.js
│   │   └── index.js
│   │
│   ├── validators/
│   │   └── execution.validator.js
│   │
│   └── utils/
│       ├── logger.js
│       ├── errors.js
│       └── constants.js
│
├── docker/
│   ├── python/Dockerfile
│   ├── cpp/Dockerfile
│   └── java/Dockerfile
│
├── existing-backend-example/
│   └── codeExecutor.service.js
│
├── tests/
│   ├── unit/
│   │   ├── parsers.test.js
│   │   ├── python.runner.test.js
│   │   ├── cpp.runner.test.js
│   │   ├── java.runner.test.js
│   │   ├── compilation-cache.service.test.js
│   │   ├── comparison.service.test.js
│   │   ├── result.service.test.js
│   │   └── execution.validator.test.js
│   ├── integration/
│   │   ├── python.integration.test.js
│   │   ├── cpp.integration.test.js
│   │   └── java.integration.test.js
│   └── security/
│       └── sandbox.security.test.js
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── README.md
└── .gitignore
```

---

## Phase 0 — Repository Bootstrap

- [ ] `npm init -y`
- [ ] Install runtime deps: `express uuid zod pino pino-pretty dotenv`
- [ ] Install dev deps: `jest supertest nodemon`
- [ ] Create `.gitignore` — exclude `node_modules/`, `.env`, `tmp/`
- [ ] Create `.env.example` (all vars documented below)
- [ ] Add `package.json` scripts: `start`, `dev`, `test`

**✓ Done when:** `node src/server.js` starts without error.

---

## Phase 1 — Project Skeleton & Configuration

### `src/utils/constants.js`
Define string enums:
- **Status:** `ACCEPTED | WRONG_ANSWER | COMPILATION_ERROR | RUNTIME_ERROR | TIME_LIMIT_EXCEEDED | MEMORY_LIMIT_EXCEEDED | OUTPUT_LIMIT_EXCEEDED | SYSTEM_ERROR | INVALID_REQUEST`
- **Language:** `python | cpp | java`

### `src/utils/errors.js`
Custom error classes — each carries a `statusCode` and `status` enum:
- `ValidationError` → 400 / `INVALID_REQUEST`
- `AuthError` → 401
- `QueueFullError` → 429 / `SYSTEM_BUSY`
- `SystemError` → 500 / `SYSTEM_ERROR`

### `src/utils/logger.js`
- Pino structured logger
- JSON in production, pretty-print in dev
- **Never log:** source code · hidden test I/O · API keys · auth headers

### `src/config/env.js`
- Load + validate all env vars with safe defaults
- Fail fast if `EXECUTOR_API_KEY` is missing
- Export typed config object

### `src/app.js`
- Create Express app
- JSON body parser
- Attach `requestId` (UUID) to every request
- Mount route groups
- Register error handler last

### `src/server.js`
- Create HTTP server
- Listen on `PORT`
- Register SIGTERM / SIGINT for graceful shutdown

**✓ Done when:** `GET /health` → `{ success: true, status: "healthy" }`.

---

## Phase 2 — Routes, Auth & Validation Middleware

### `src/routes/health.routes.js`
```
GET /health   →  no auth
```

### `src/routes/language.routes.js`
```
GET /api/v1/languages   →  auth required
```

### `src/routes/execution.routes.js`
```
POST /api/v1/execute   →  auth required + validation
```

### `src/middleware/auth.js`
- Parse `Authorization: Bearer <token>`
- Constant-time compare to `EXECUTOR_API_KEY`
- Return `401` on failure — never log the received token

### `src/validators/execution.validator.js` (Zod)
Validate and enforce:
| Field | Rule |
|---|---|
| `language` | enum `python \| cpp \| java` |
| `code` | string, max `MAX_CODE_SIZE_BYTES` |
| `tests[]` | max `MAX_TEST_CASES`; each has `id`, `name`, `input`, `expectedOutput`; optional `visibility` |
| `problem` | required: `type`, `className`, `functionName`, `parameters[]`, `returnType` |
| `parameters[].type` | must be in allowed type list |
| ANY of | `limits`, `comparisonMode`, `compileCommand`, `runCommand`, `shellCommand` | **Rejected** — 400. Limits and modes are strictly trusted server configs. |

### `src/middleware/validation.js`
Applies Zod schema; on failure → `400 INVALID_REQUEST`.

**✓ Done when:** Bad requests are rejected before touching execution logic.

---

## Phase 3 — Workspace Manager

### `src/services/workspace.service.js`
| Method | Description |
|---|---|
| `createWorkspace(jobId)` | Creates `/tmp/executor/<jobId>/` |
| `writeFile(jobId, filename, content)` | Writes into workspace |
| `getWorkspacePath(jobId)` | Returns absolute path |
| `cleanup(jobId)` | Recursively deletes workspace |

> Cleanup is **always** called in a `finally` block — success, failure, crash, timeout.
> Ownership of files must be handled carefully to accommodate UID 10001 mapping.

**✓ Done when:** Workspaces are created and always cleaned.

---

## Phase 4 — Compilation Cache

### `src/services/compilation-cache.service.js`

Implement a compilation caching mechanism to avoid recompiling identical submissions across multiple requests.

**Core Rules:**
- The cache stores **compiled artifacts only**. Never reuse a running Docker container.
- Cache storage directory: `/tmp/executor-cache/` (owned/protected by executor service).
- Cache metadata structure: `submissionHash`, `language`, `runnerVersion`, `compilerVersion`, `createdAt`, `lastUsedAt`.
- Expiration and size: Enforce `COMPILE_CACHE_TTL_SECONDS` and `COMPILE_CACHE_MAX_ENTRIES` (LRU eviction).
- Python does not require compilation caching.

**Cache Key (Submission Hash):**
Generate a deterministic `submissionHash` using SHA-256:
```javascript
SHA256( language + code + stable(problem) + RUNNER_VERSION + COMPILER_VERSION )
```
*Never include test inputs or expected outputs in the hash.*

**Methods:**
| Method | Description |
|---|---|
| `getCacheEntry(hash)` | Returns artifact path if hit, valid, and uncorrupted. Updates `lastUsedAt`. |
| `storeArtifact(hash, workspacePath, files)` | Copies compiled artifact to `/tmp/executor-cache/<lang>/<hash>/` and writes `metadata.json`. |
| `evictStale()` | Removes entries exceeding TTL or Max limit (LRU). |

**✓ Done when:** Identical C++/Java submissions return cache hits, fetching artifacts from `/tmp/executor-cache` instead of recompiling.

---

## Phase 5 — Language Adapters & Runner Generation

**CRITICAL RULE:** Generate the runner ONCE. The generated runner itself must parse arguments dynamically from `stdin`. Remove Node-side `parsedArgs` dependency entirely.

Every adapter exposes this interface:
```js
{
  language,           // "python" | "cpp" | "java"
  runnerVersion,      // Version for cache hash
  compilerVersion,    // Version for cache hash
  validateSubmission(code),
  generateSource(code, problem), // Generates standard parsing logic from stdin
  getCompileCommand(),  // null for Python
  getRunCommand(),
  getDockerImage()
}
```

### Python

**`src/languages/python/config.js`**
- Image: `PYTHON_IMAGE` env
- Source file: `main.py`
- No compile step

**`src/languages/python/runner.js`**
- Appends solution class + `sys.stdin` reading/parsing logic based on `problem.parameters`.

### C++

**`src/languages/cpp/config.js`**
- Image: `CPP_IMAGE` env
- Source: `Main.cpp`, binary: `solution`
- Flags: `-O2 -std=c++17`

**`src/languages/cpp/runner.js`**
- Wraps candidate class in full `.cpp`
- Includes `<iostream>` etc.
- Generates `main()` that reads from `cin` based on `problem.parameters`, calls Solution, and prints.

### Java

**`src/languages/java/config.js`**
- Image: `JAVA_IMAGE` env
- Source: `Main.java`
- Memory: Container limit > 256MB to accommodate JVM overhead.

**`src/languages/java/runner.js`**
- Appends `Solution` class + `public class Main` with `main()`.
- Generates `Scanner` logic to read from `System.in`.

**✓ Done when:** Runners read inputs from `stdin`, removing Node.js parsing overhead.

---

## Phase 6 — Docker Service

### `src/services/docker.service.js`

**`compile(jobId, adapter, workspacePath, timeoutMs)`**
- Runs compile command inside restricted container
- Workspace mounted as **read-write** (`-v <workspacePath>:/workspace:rw`)
- Returns `{ success, stdout, stderr }`

**`runTest(jobId, adapter, workspacePath, stdinInput, timeoutMs, memoryMb)`**
- Runs binary/script inside restricted container
- Workspace (or Cache Artifact Path) mounted as **read-only** (`-v <path>:/workspace:ro`)
- Pipes `stdinInput` to process.
- Streams output. **If output exceeds `MAX_OUTPUT_BYTES`, immediately kill container and return `OUTPUT_LIMIT_EXCEEDED`.** (Do NOT just truncate).
- Kills container on timeout.

**Hardcoded Docker flags (never user-controlled):**
```bash
docker run \
  --rm \
  --network none \
  --memory <MEMORY_LIMIT_MB>m \
  --cpus 1 \
  --pids-limit 64 \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --read-only \
  --tmpfs /tmp \
  -w /workspace \
  --user 10001:10001
```

> ❌ Never mount `/var/run/docker.sock` into user containers.  

**✓ Done when:** Python `print("hello")` runs in sandbox. Infinite loops timeout. Giant outputs kill the container.

---

## Phase 7 — Comparison Service

### `src/services/comparison.service.js`

`compare(actual, expected) → boolean`

| Mode | Behaviour |
|---|---|
| `normalized` | Trim whitespace · normalize `\r\n` → `\n` · strip trailing spaces per line |

**Comparison mode is strictly trusted and hardcoded/configured on the server.** Candidates cannot specify comparison modes.

**✓ Done when:** `"6\n"` vs `"6  \n"` → PASS in normalized mode.

---

## Phase 8 — Result Service

### `src/services/result.service.js`

| Method | Description |
|---|---|
| `buildTestResult(...)` | Single test result object |
| `buildSummary(...)` | `{ passed, total }` |
| `determineStatus(...)` | Top-level status enum |

> **Hidden tests (`visibility: "hidden"`):** include `id`, `passed`, `timeMs` — **never** `input`, `expectedOutput`, `actual`, or `stderr`.

**✓ Done when:** Hidden test data never leaks to output.

---

## Phase 9 — Execution Service (Orchestrator)

### `src/services/execution.service.js`

`execute(jobId, payload)` flow:
```text
Request
→ Authenticate
→ Validate
→ Generate submissionHash
→ Check compilation cache
    ├── HIT
    │     └── reuse compiled artifact path for execution
    └── MISS
          ├── Generate runner source ONCE
          ├── Compile once (C++/Java); skip for Python
          ├── If compile fails → return COMPILATION_ERROR immediately
          └── Cache artifact securely
→ For each test:
      a. Check GLOBAL_TIMEOUT_MS. If exceeded -> return SYSTEM_ERROR / timeout.
      b. Run in Docker sandbox (Read-Only mount of Cache or Workspace)
      c. Pipe stdin
      d. Check for OUTPUT_LIMIT_EXCEEDED (kill if triggered)
      e. Compare output
      f. Build test result
      g. If RUNTIME_ERROR and STOP_ON_RUNTIME_ERROR → break
      h. If timeout → mark TLE, break
→ Build final result (optionally append `cacheHit` boolean for debugging)
→ FINALLY → cleanup candidate workspace (Cache is untouched)
```

**✓ Done when:** Compile once, run many via `stdin`. Cache hits skip compilation step. Global timeout respected.

---

## Phase 10 — Queue Service

### `src/services/queue.service.js`

- In-memory FIFO queue
- `MAX_CONCURRENT_JOBS` active slots; `MAX_QUEUE_SIZE` waiting slots
- `enqueue(job)` → Promise; resolves when job completes
- Queue full → throw `QueueFullError` immediately

**✓ Done when:** Concurrency is enforced.

---

## Phase 11 — Execution Controller & Graceful Shutdown

### `src/controllers/execution.controller.js`
Map errors to HTTP responses (400, 401, 429, 500, 200).

### `src/server.js` Graceful Shutdown
Handle `SIGTERM`/`SIGINT`. Drain queue, kill containers, clean workspaces, exit.

**✓ Done when:** API works end-to-end, Ctrl+C cleans up safely.

---

## Phase 12 — Docker Images

### `docker/python/Dockerfile`
```dockerfile
FROM python:3.12-slim
RUN groupadd -g 10001 sandbox && useradd -u 10001 -g 10001 -m sandbox
```

### `docker/cpp/Dockerfile`
```dockerfile
FROM gcc:13-bookworm
RUN groupadd -g 10001 sandbox && useradd -u 10001 -g 10001 -m sandbox
```

### `docker/java/Dockerfile`
```dockerfile
FROM eclipse-temurin:21-jdk-jammy
RUN groupadd -g 10001 sandbox && useradd -u 10001 -g 10001 -m sandbox
```

**✓ Done when:** All images map to strict UID/GID 10001.

---

## Phase 13 — Environment Variables & Tests

| Variable | Default | Description |
|---|---|---|
| `GLOBAL_TIMEOUT_MS` | `30000` | Global execution cap across all tests |
| `MAX_OUTPUT_BYTES` | `51200` | Process killed if output exceeds this |
| `MEMORY_LIMIT_MB` | `256` | Container memory cap (Increased for Java) |
| `COMPILE_CACHE_ENABLED`| `true` | Enable or disable compilation cache |
| `COMPILE_CACHE_TTL_SECONDS`| `600` | Max age for cached artifacts (10 mins) |
| `COMPILE_CACHE_MAX_ENTRIES`| `1000` | Max cache capacity for LRU eviction |

### Tests Requirement Update:

Add test suite specifically for `compilation-cache.service.test.js` covering:
1. First identical C++ request → compilation occurs.
2. Second identical C++ request → compilation is skipped.
3. First identical Java request → compilation occurs.
4. Second identical Java request → compilation is skipped.
5. Changing one character in code → cache miss.
6. Changing the problem definition → cache miss.
7. Changing runner version → cache miss.
8. Changing compiler/runtime version → cache miss.
9. Same code with different test cases → same compilation artifact may be reused.
10. Hidden test data is never part of the cache key.
11. Cached artifact cannot be modified by candidate code.
12. Expired cache entries are removed.
13. Cache size limit is enforced.
14. Cache hit still runs inside a fresh restricted Docker container.
15. Cache hit cannot bypass authentication or validation.
16. Corrupted/missing artifact is treated as a cache miss and safely recompiled.

---

## Implementation Order
1. Repo Bootstrap
2. Config & Skeletons
3. Workspace & UID 10001 Mapping
4. Compilation Cache Service
5. Language Adapters (Stdin Parsing generated ONCE)
6. Docker Sandbox (Read/Write for compile, Read-Only + tmpfs for run)
7. Stream/Output limit killing
8. Orchestrator (Cache lookup, Compile Once, Run Many, Global Timeout)
9. Results filtering & Response formatting
10. Docker Images & Testing

---

## Final Acceptance Checklist Updates
*Ensure all existing checklist items are met, plus:*
- [ ] Repeated C++/Java submissions skip the compilation step (Cache HIT).
- [ ] Cache properly evicts based on TTL and LRU max limits.
- [ ] Cached artifacts are mounted entirely read-only inside isolated sandbox executions.
- [ ] The generated hash strictly ignores test-cases, input/output, and limits.
