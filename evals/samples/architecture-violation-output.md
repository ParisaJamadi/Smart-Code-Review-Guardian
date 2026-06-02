## Architecture Findings

- **Severity:** HIGH
- **Category:** Architecture
- **File:** src/controllers/userController.js
- **Evidence:** Controller imports `../database/client` and executes `db.query` directly in `getUser`.
- **Why it matters:** Violates layered architecture — HTTP layer should not access persistence directly; bypasses service/repository boundaries.
- **Suggested fix:** Introduce `UserRepository.getById(id)` and call via `UserService` from controller.

**Inferred from repository structure — no explicit ARCHITECTURE.md found.**
