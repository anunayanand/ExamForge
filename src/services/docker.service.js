const { spawn } = require('child_process');
const logger = require('../utils/logger');
const { Status } = require('../utils/constants');

class DockerService {
    _getCommonFlags(memoryMb, readOnlyPath, isReadWrite = false) {
        const mountMode = isReadWrite ? 'rw' : 'ro';
        return [
            'run',
            '--rm',
            '-i', // interactive to allow stdin
            '--network', 'none',
            '--memory', `${memoryMb}m`,
            '--cpus', '1',
            '--pids-limit', '64',
            '--cap-drop', 'ALL',
            '--security-opt', 'no-new-privileges',
            '--read-only',
            '--tmpfs', '/tmp',
            '-w', '/workspace',
            '-v', `${readOnlyPath}:/workspace:${mountMode}`,
            // '--user', '10001:10001' // Assuming docker image creates this user, mapping logic 
        ];
    }

    async compile(jobId, adapter, workspacePath, timeoutMs) {
        const compileCmd = adapter.getCompileCommand();
        if (!compileCmd) return { success: true, stdout: '', stderr: '' }; // Python

        const dockerArgs = [
            ...this._getCommonFlags(256, workspacePath, true),
            adapter.image,
            ...compileCmd
        ];

        return this._executeDocker(jobId, dockerArgs, null, timeoutMs, 1024 * 1024); // 1MB compile output limit
    }

    async runTest(jobId, adapter, workspacePath, stdinInput, timeoutMs, memoryMb, maxOutputBytes) {
        const runCmd = adapter.getRunCommand();
        const dockerArgs = [
            ...this._getCommonFlags(memoryMb, workspacePath, false),
            adapter.image,
            ...runCmd
        ];

        return this._executeDocker(jobId, dockerArgs, stdinInput, timeoutMs, maxOutputBytes);
    }

    _executeDocker(jobId, args, stdinInput, timeoutMs, maxOutputBytes) {
        return new Promise((resolve) => {
            const child = spawn('docker', args);

            let stdout = '';
            let stderr = '';
            let isKilled = false;
            let outputLimitExceeded = false;
            let outputBytes = 0;

            const timeoutId = setTimeout(() => {
                isKilled = true;
                child.kill('SIGKILL');
            }, timeoutMs);

            if (child.stdin) {
                child.stdin.on('error', (err) => {
                    // Ignore EPIPE errors if the child process closed its stdin unexpectedly
                });
                
                if (stdinInput) {
                    child.stdin.write(stdinInput);
                }
                child.stdin.end();
            }

            child.stdout.on('data', (data) => {
                if (outputLimitExceeded) return;
                
                outputBytes += Buffer.byteLength(data);
                if (outputBytes > maxOutputBytes) {
                    outputLimitExceeded = true;
                    isKilled = true;
                    child.kill('SIGKILL');
                    return;
                }
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                if (outputLimitExceeded) return;
                stderr += data.toString();
            });

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                
                if (outputLimitExceeded) {
                    resolve({ success: false, status: Status.OUTPUT_LIMIT_EXCEEDED, stdout, stderr });
                } else if (isKilled) {
                    resolve({ success: false, status: Status.TIME_LIMIT_EXCEEDED, stdout, stderr });
                } else if (code !== 0) {
                    resolve({ success: false, status: Status.RUNTIME_ERROR, stdout, stderr, code });
                } else {
                    resolve({ success: true, stdout, stderr });
                }
            });

            child.on('error', (err) => {
                clearTimeout(timeoutId);
                logger.error({ jobId, err }, 'Failed to spawn docker container');
                resolve({ success: false, status: Status.SYSTEM_ERROR, stdout: '', stderr: err.message });
            });
        });
    }
}

module.exports = new DockerService();
