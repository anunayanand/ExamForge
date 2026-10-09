# Exam Code Execution Engine - API Documentation

## Authentication
All endpoints under `/api/v1/*` require authentication via a Bearer token.
**Header:** `Authorization: Bearer <EXECUTOR_API_KEY>`

*(Configure your `EXECUTOR_API_KEY` inside your `.env` file.)*

---

## 1. Health Check
Quickly checks if the execution engine is up and running.

- **Endpoint:** `GET /health`
- **Auth Required:** No

**Response (200 OK):**
```json
{
  "success": true,
  "status": "healthy"
}
```

---

## 2. Get Supported Languages
Returns a list of supported programming languages.

- **Endpoint:** `GET /api/v1/languages`
- **Auth Required:** Yes

**Response (200 OK):**
```json
{
  "success": true,
  "data": ["python", "cpp", "java"]
}
```

---

## 3. Execute Code
Compiles (if applicable) and executes the provided code against multiple test cases securely inside an isolated Docker sandbox.

- **Endpoint:** `POST /api/v1/execute`
- **Auth Required:** Yes
- **Content-Type:** `application/json`

### Request Payload Format

```json
{
  "language": "python", // Options: "python", "cpp", "java"
  "code": "class Solution:\n    def add(self, a, b):\n        return a + b\n",
  "problem": {
    "className": "Solution",
    "functionName": "add",
    "parameters": [
      { "name": "a", "type": "integer" },
      { "name": "b", "type": "integer" }
    ],
    "returnType": "integer"
  },
  "tests": [
    {
      "id": "test_1",
      "input": "2\n3",  // Provide newline-separated arguments in the string
      "expectedOutput": "5",
      "visibility": "public" // Options: "public" or "hidden"
    },
    {
      "id": "test_2",
      "input": "10\n-5",
      "expectedOutput": "5",
      "visibility": "hidden" 
    }
  ]
}
```

### Response Format (200 OK)
*Note: A 200 HTTP status is returned even if the candidate's code has a syntax error or is wrong. Logical execution errors are mapped strictly to the `status` enum within the response body.*

```json
{
  "success": true, // Only true if ALL test cases pass
  "status": "ACCEPTED", // Top-level submission status enum
  "jobId": "2186a6b7-72fb-4b1e-be31-3707d40753a6",
  "cacheHit": false, // True if the exact source-code + environment matched a compiled binary
  "summary": {
    "passed": 2,
    "total": 2
  },
  "results": [
    {
      "id": "test_1",
      "passed": true,
      "timeMs": 566,
      "status": "ACCEPTED",
      "input": "2\n3",
      "expectedOutput": "5",
      "actualOutput": "5\n"
    },
    {
      "id": "test_2",
      "passed": true,
      "timeMs": 594,
      "status": "ACCEPTED"
      // Notice that 'input', 'expectedOutput', and 'actualOutput' are omitted to prevent leaking hidden tests!
    }
  ]
}
```

### Response on Compilation Error
If the code is invalid or syntax is broken, it will halt before running the tests.

```json
{
  "success": false,
  "status": "COMPILATION_ERROR",
  "message": "g++ error details here...",
  "jobId": "f21d4b2e-af2b-49c1-b78d-09b2606411ed",
  "cacheHit": false,
  "summary": { "passed": 0, "total": 2 },
  "results": []
}
```

---

## Status Enums Glossary

| Status Enum | Description |
|---|---|
| `ACCEPTED` | Code executed flawlessly and all assertions passed. |
| `WRONG_ANSWER` | Execution completed, but the printed output did not match `expectedOutput`. |
| `COMPILATION_ERROR` | Code failed to compile (Syntax error). |
| `RUNTIME_ERROR` | The process crashed during execution (e.g., NullPointerException, IndexOutOfBounds, syntax error in Python). |
| `TIME_LIMIT_EXCEEDED` | The code took longer than `GLOBAL_TIMEOUT_MS` to resolve. Usually an infinite loop. |
| `OUTPUT_LIMIT_EXCEEDED` | The code spammed output larger than `MAX_OUTPUT_BYTES`. The container was killed. |
| `SYSTEM_ERROR` | An internal service, docker, or orchestration failure. |
| `INVALID_REQUEST` | The POST payload structure was invalid (Missing problem parameters, invalid language, etc.). Returned as an HTTP 400. |
