const { Status } = require('../utils/constants');

class ResultService {
    buildTestResult(testCase, isPassed, actualOutput, stderr, timeMs, overrideStatus = null) {
        const isHidden = testCase.visibility === 'hidden';

        const result = {
            id: testCase.id,
            name: testCase.name,
            passed: isPassed,
            timeMs,
            status: overrideStatus || (isPassed ? Status.ACCEPTED : Status.WRONG_ANSWER)
        };

        if (!isHidden) {
            result.input = testCase.input;
            result.expectedOutput = testCase.expectedOutput;
            result.actualOutput = actualOutput;
            if (stderr) {
                result.stderr = stderr;
            }
        }

        return result;
    }

    buildSummary(results) {
        const total = results.length;
        const passed = results.filter(r => r.passed).length;
        return { passed, total };
    }

    determineStatus(results) {
        if (results.length === 0) return Status.ACCEPTED;

        const failedResult = results.find(r => !r.passed);
        if (failedResult) {
            return failedResult.status;
        }

        return Status.ACCEPTED;
    }
}

module.exports = new ResultService();
