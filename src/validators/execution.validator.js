const { z } = require('zod');
const { Language } = require('../utils/constants');

const testCaseSchema = z.object({
    id: z.string().or(z.number()),
    name: z.string().optional(),
    input: z.string(),
    expectedOutput: z.string(),
    visibility: z.enum(['public', 'hidden']).optional()
});

const parameterSchema = z.object({
    type: z.string(), // We will restrict types further if needed
    name: z.string().optional()
});

const problemSchema = z.object({
    type: z.string().optional(),
    className: z.string(),
    functionName: z.string(),
    parameters: z.array(parameterSchema),
    returnType: z.string()
});

const executionSchema = z.object({
    language: z.nativeEnum(Language),
    code: z.string().max(1024 * 1024), // MAX_CODE_SIZE_BYTES logic if needed (e.g., 1MB)
    tests: z.array(testCaseSchema).max(100), // Max TEST_CASES
    problem: problemSchema
}).strict(); // Strict prevents ANY other fields like limits, runCommand etc.

module.exports = {
    executionSchema
};
