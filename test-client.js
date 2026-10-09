const http = require('http');

const problemConfig = {
    className: "Solution",
    functionName: "add",
    parameters: [
        { name: "a", type: "integer" },
        { name: "b", type: "integer" }
    ],
    returnType: "integer"
};

const tests = [
    { id: "1", input: "2\n3", expectedOutput: "5", visibility: "public" },
    { id: "2", input: "10\n-5", expectedOutput: "5", visibility: "hidden" }
];

const payloads = [
    {
        language: "python",
        code: `
class Solution:
    def add(self, a, b):
        return a + b
`,
        tests,
        problem: problemConfig
    },
    {
        language: "cpp",
        code: `
class Solution {
public:
    int add(int a, int b) {
        return a + b;
    }
};
`,
        tests,
        problem: problemConfig
    },
    {
        language: "java",
        code: `
class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}
`,
        tests,
        problem: problemConfig
    }
];

require('dotenv').config();

const apiKey = process.env.EXECUTOR_API_KEY || 'my_secret_key';

const sendRequest = (payload) => {
    return new Promise((resolve, reject) => {
        const payloadStr = JSON.stringify(payload);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/execute',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(payloadStr)
            }
        };

        console.log(`\n===========================================`);
        console.log(`Sending ${payload.language.toUpperCase()} test request...`);
        console.log(`===========================================`);

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                console.log(`Status Code: ${res.statusCode}`);
                console.log('Response:');
                console.log(JSON.stringify(JSON.parse(data), null, 2));
                resolve();
            });
        });

        req.on('error', error => {
            console.error('\nError making request:', error.message);
            reject(error);
        });

        req.write(payloadStr);
        req.end();
    });
};

const runAll = async () => {
    try {
        // Run python, cpp, java sequentially
        for (const payload of payloads) {
            await sendRequest(payload);
        }
        
        // Test Compilation Cache with a duplicate C++ request
        console.log(`\n>>> Testing Compilation Cache for C++...`);
        await sendRequest(payloads[1]); // C++ again
    } catch (e) {
        console.error("Test execution failed:", e);
    }
};

runAll();
