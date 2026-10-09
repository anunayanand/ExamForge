const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

const CACHE_BASE_DIR = path.join(process.cwd(), 'tmp', 'executor-cache');

class CompilationCacheService {
    getCachePath(language, hash) {
        return path.join(CACHE_BASE_DIR, language, hash);
    }

    generateHash(language, code, problem, runnerVersion, compilerVersion) {
        const payload = JSON.stringify({
            language,
            code,
            problem, // JSON.stringify is deterministic enough if keys are ordered, or we assume stable structure
            runnerVersion,
            compilerVersion
        });
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    async getCacheEntry(language, hash) {
        if (!config.compileCacheEnabled) return null;

        const cachePath = this.getCachePath(language, hash);
        const metadataPath = path.join(cachePath, 'metadata.json');

        try {
            const metadataStr = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataStr);

            // Check if corrupted (basic check)
            if (metadata.submissionHash !== hash) {
                throw new Error('Corrupted cache entry');
            }

            // Update lastUsedAt
            metadata.lastUsedAt = Date.now();
            await fs.writeFile(metadataPath, JSON.stringify(metadata), 'utf8');

            return cachePath;
        } catch (error) {
            // Miss or corrupted
            return null;
        }
    }

    async storeArtifact(language, hash, workspacePath, files, runnerVersion, compilerVersion) {
        if (!config.compileCacheEnabled) return;

        const cachePath = this.getCachePath(language, hash);
        
        try {
            await fs.mkdir(cachePath, { recursive: true, mode: 0o777 });

            for (const file of files) {
                const src = path.join(workspacePath, file);
                const dest = path.join(cachePath, file);
                await fs.copyFile(src, dest);
            }

            const metadata = {
                submissionHash: hash,
                language,
                runnerVersion,
                compilerVersion,
                createdAt: Date.now(),
                lastUsedAt: Date.now()
            };

            await fs.writeFile(path.join(cachePath, 'metadata.json'), JSON.stringify(metadata), { mode: 0o666 });

            // Trigger async eviction
            this.evictStale().catch(err => logger.error({ err }, 'Eviction failed'));
        } catch (error) {
            logger.error({ language, hash, error }, 'Failed to store cache artifact');
            // Cleanup partial writes
            await fs.rm(cachePath, { recursive: true, force: true }).catch(() => {});
        }
    }

    async evictStale() {
        const ttlMs = config.compileCacheTtlSeconds * 1000;
        const now = Date.now();
        let allEntries = [];

        try {
            const languages = await fs.readdir(CACHE_BASE_DIR).catch(() => []);
            for (const lang of languages) {
                const langPath = path.join(CACHE_BASE_DIR, lang);
                const stat = await fs.stat(langPath);
                if (!stat.isDirectory()) continue;

                const hashes = await fs.readdir(langPath);
                for (const hash of hashes) {
                    const cachePath = path.join(langPath, hash);
                    const metadataPath = path.join(cachePath, 'metadata.json');
                    try {
                        const metadataStr = await fs.readFile(metadataPath, 'utf8');
                        const metadata = JSON.parse(metadataStr);
                        allEntries.push({ cachePath, ...metadata });
                    } catch (e) {
                        // Corrupted or empty, delete it
                        await fs.rm(cachePath, { recursive: true, force: true }).catch(() => {});
                    }
                }
            }

            // 1. Evict expired
            const validEntries = [];
            for (const entry of allEntries) {
                if (now - entry.lastUsedAt > ttlMs) {
                    await fs.rm(entry.cachePath, { recursive: true, force: true }).catch(() => {});
                    logger.debug({ hash: entry.submissionHash }, 'Evicted expired cache entry');
                } else {
                    validEntries.push(entry);
                }
            }

            // 2. Evict LRU if exceeds max entries
            if (validEntries.length > config.compileCacheMaxEntries) {
                validEntries.sort((a, b) => b.lastUsedAt - a.lastUsedAt); // Descending
                const toEvict = validEntries.slice(config.compileCacheMaxEntries);
                for (const entry of toEvict) {
                    await fs.rm(entry.cachePath, { recursive: true, force: true }).catch(() => {});
                    logger.debug({ hash: entry.submissionHash }, 'Evicted LRU cache entry');
                }
            }
        } catch (error) {
            logger.error({ error }, 'Error during cache eviction');
        }
    }
}

module.exports = new CompilationCacheService();
