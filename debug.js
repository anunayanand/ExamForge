const executionService = require('./src/services/execution.service');
const crypto = require('crypto');

const payload = {
    language: "cpp",
    code: `
class Solution {
public:
    int add(int a, int b) {
        return a + b;
    }
};
    `,
    tests: [
        { id: "1", input: "2\n3", expectedOutput: "5", visibility: "public" }
    ],
    problem: {
        className: "Solution",
        functionName: "add",
        parameters: [
            { name: "a", type: "integer" },
            { name: "b", type: "integer" }
        ],
        returnType: "integer"
    }
};

const jobId = crypto.randomUUID();

executionService.execute(jobId, payload).then(result => {
    console.log("Result:", result);
}).catch(err => {
    console.error("Execution crashed with error:", err);
});
