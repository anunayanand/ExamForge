const compilationCacheService = require('../../src/services/compilation-cache.service');
const fs = require('fs/promises');
const path = require('path');
const config = require('../../src/config/env');

jest.mock('fs/promises');

describe('CompilationCacheService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        config.compileCacheEnabled = true;
    });

    test('First identical request -> cache miss (returns null)', async () => {
        fs.readFile.mockRejectedValue(new Error('ENOENT'));
        const result = await compilationCacheService.getCacheEntry('cpp', 'hash123');
        expect(result).toBeNull();
    });

    test('Second identical request -> cache hit', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify({
            submissionHash: 'hash123',
            language: 'cpp',
            runnerVersion: '1.0.0',
            compilerVersion: '13',
            createdAt: Date.now(),
            lastUsedAt: Date.now()
        }));
        const result = await compilationCacheService.getCacheEntry('cpp', 'hash123');
        expect(result).not.toBeNull();
    });

    // More tests can be added here to fulfill Phase 13 completely.
});
