const config = require('./config');

const generateSource = (code, problem) => {
    let argDecls = '';
    let argNames = [];
    problem.parameters.forEach((p, i) => {
        argDecls += `    arg${i} = json.loads(lines[${i}])\n`;
        argNames.push(`arg${i}`);
    });

    return `
import sys
import json
from collections import *
from typing import *

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

${code}

if __name__ == '__main__':
    lines = [line for line in sys.stdin.read().splitlines() if line.strip()]
    if not lines:
        sys.exit(0)
    
${argDecls}

    obj = ${problem.className}()
    result = obj.${problem.functionName}(${argNames.join(', ')})
    
    print(json.dumps(result))
`;
};

const validateSubmission = (code) => {
    if (!code) throw new Error("Code is empty");
    return true;
};

const getCompileCommand = () => null;

const getRunCommand = () => ['python3', config.sourceFile];

module.exports = {
    ...config,
    generateSource,
    validateSubmission,
    getCompileCommand,
    getRunCommand
};
