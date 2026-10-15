// Deterministic, secret-free environment for unit tests (no database is contacted).
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
