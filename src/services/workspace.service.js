const fs = require('fs/promises');
const path = require('path');
const logger = require('../utils/logger');

const BASE_DIR = path.join(process.cwd(), 'tmp', 'executor');

class WorkspaceService {
    getWorkspacePath(jobId) {
        return path.join(BASE_DIR, jobId);
    }

    async createWorkspace(jobId) {
        const workspacePath = this.getWorkspacePath(jobId);
        try {
            await fs.mkdir(workspacePath, { recursive: true, mode: 0o777 });
            logger.debug({ jobId, workspacePath }, 'Workspace created');
            return workspacePath;
        } catch (error) {
            logger.error({ jobId, error }, 'Failed to create workspace');
            throw error;
        }
    }

    async writeFile(jobId, filename, content) {
        const workspacePath = this.getWorkspacePath(jobId);
        const filePath = path.join(workspacePath, filename);
        try {
            await fs.writeFile(filePath, content, { mode: 0o666 });
            return filePath;
        } catch (error) {
            logger.error({ jobId, filename, error }, 'Failed to write file to workspace');
            throw error;
        }
    }

    async cleanup(jobId) {
        const workspacePath = this.getWorkspacePath(jobId);
        try {
            await fs.rm(workspacePath, { recursive: true, force: true });
            logger.debug({ jobId, workspacePath }, 'Workspace cleaned up');
        } catch (error) {
            logger.error({ jobId, error }, 'Failed to cleanup workspace');
            // We usually don't throw here to avoid masking the original error in the finally block
        }
    }
}

module.exports = new WorkspaceService();
