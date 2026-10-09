require('dotenv').config();

const getEnv = (key, defaultValue) => {
    const value = process.env[key];
    if (value === undefined || value === '') {
        return defaultValue;
    }
    return value;
};

// Fail fast if required variable is missing
if (!process.env.EXECUTOR_API_KEY) {
    console.error('FATAL: EXECUTOR_API_KEY environment variable is missing.');
    process.exit(1);
}

const config = {
    port: parseInt(getEnv('PORT', '3000'), 10),
    executorApiKey: process.env.EXECUTOR_API_KEY,
    globalTimeoutMs: parseInt(getEnv('GLOBAL_TIMEOUT_MS', '30000'), 10),
    maxOutputBytes: parseInt(getEnv('MAX_OUTPUT_BYTES', '51200'), 10),
    memoryLimitMb: parseInt(getEnv('MEMORY_LIMIT_MB', '256'), 10),
    compileCacheEnabled: getEnv('COMPILE_CACHE_ENABLED', 'true') === 'true',
    compileCacheTtlSeconds: parseInt(getEnv('COMPILE_CACHE_TTL_SECONDS', '600'), 10),
    compileCacheMaxEntries: parseInt(getEnv('COMPILE_CACHE_MAX_ENTRIES', '1000'), 10),
    pythonImage: getEnv('PYTHON_IMAGE', 'python:3.12-slim'),
    cppImage: getEnv('CPP_IMAGE', 'gcc:13-bookworm'),
    javaImage: getEnv('JAVA_IMAGE', 'eclipse-temurin:21-jdk-jammy'),
    nodeEnv: getEnv('NODE_ENV', 'development'),
};

module.exports = config;
