const config = require('../config/env');
const workspaceService = require('./workspace.service');
const compilationCacheService = require('./compilation-cache.service');
const dockerService = require('./docker.service');
const comparisonService = require('./comparison.service');
const resultService = require('./result.service');
const languages = require('../languages');
const logger = require('../utils/logger');
const { Status } = require('../utils/constants');

class ExecutionService {
    async execute(jobId, payload) {
        const adapter = languages[payload.language];
        let workspacePath = null;
        let artifactPath = null;
        let cacheHit = false;

        const startTime = Date.now();

        try {
            // 1. Generate Submission Hash
            const submissionHash = compilationCacheService.generateHash(
                adapter.language,
                payload.code,
                payload.problem,
                adapter.runnerVersion,
                adapter.compilerVersion
            );

            // 2. Check Compilation Cache
            const cachedPath = await compilationCacheService.getCacheEntry(adapter.language, submissionHash);

            if (cachedPath) {
                artifactPath = cachedPath;
                cacheHit = true;
                logger.debug({ jobId, submissionHash }, 'Cache hit');
            } else {
                logger.debug({ jobId, submissionHash }, 'Cache miss');
                
                // 3. Create Workspace
                workspacePath = await workspaceService.createWorkspace(jobId);

                // 4. Generate Runner Source
                const runnerSource = adapter.generateSource(payload.code, payload.problem);
                
                // Write source file to workspace
                await workspaceService.writeFile(jobId, adapter.sourceFile, runnerSource);

                // 5. Compile if needed
                const compileCmd = adapter.getCompileCommand();
                if (compileCmd) {
                    const compileResult = await dockerService.compile(jobId, adapter, workspacePath, config.globalTimeoutMs);
                    if (!compileResult.success) {
                        return {
                            success: false,
                            status: Status.COMPILATION_ERROR,
                            message: compileResult.stderr || compileResult.stdout
                        };
                    }

                    // 6. Store Artifact in Cache securely
                    await compilationCacheService.storeArtifact(
                        adapter.language,
                        submissionHash,
                        workspacePath,
                        [adapter.binaryFile || adapter.sourceFile], // Store binary (or source if no binary)
                        adapter.runnerVersion,
                        adapter.compilerVersion
                    );
                }

                artifactPath = workspacePath;
            }

            // 7. Run Tests
            const results = [];
            let timeRemaining = config.globalTimeoutMs - (Date.now() - startTime);

            for (const testCase of payload.tests) {
                if (timeRemaining <= 0) {
                    results.push(resultService.buildTestResult(testCase, false, null, null, 0, Status.SYSTEM_ERROR));
                    break;
                }

                const testStart = Date.now();
                const runResult = await dockerService.runTest(
                    jobId,
                    adapter,
                    artifactPath,
                    testCase.input,
                    timeRemaining,
                    config.memoryLimitMb,
                    config.maxOutputBytes
                );
                const testDuration = Date.now() - testStart;
                timeRemaining -= testDuration;

                let isPassed = false;
                let status = runResult.status;

                if (runResult.success) {
                    isPassed = comparisonService.compare(runResult.stdout, testCase.expectedOutput);
                    if (isPassed) {
                        status = Status.ACCEPTED;
                    } else {
                        status = Status.WRONG_ANSWER;
                    }
                }

                const testResult = resultService.buildTestResult(
                    testCase,
                    isPassed,
                    runResult.stdout,
                    runResult.stderr,
                    testDuration,
                    status
                );
                results.push(testResult);

                // Break early on critical errors if required (e.g. STOP_ON_RUNTIME_ERROR)
                // For now, we continue unless it's a TLE that killed the test due to timeout
            }

            const summary = resultService.buildSummary(results);
            const overallStatus = resultService.determineStatus(results);

            return {
                success: overallStatus === Status.ACCEPTED,
                status: overallStatus,
                jobId,
                cacheHit,
                summary,
                results
            };

        } catch (error) {
            logger.error({ jobId, error }, 'Execution failed');
            return {
                success: false,
                status: Status.SYSTEM_ERROR,
                message: 'Internal System Error'
            };
        } finally {
            if (workspacePath) {
                await workspaceService.cleanup(jobId);
            }
        }
    }
}

module.exports = new ExecutionService();
