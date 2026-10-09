const config = require('./config');

const mapToCppType = (type) => {
    const typeMap = {
        'integer': 'int',
        'integer[]': 'vector<int>',
        'integer[][]': 'vector<vector<int>>',
        'string': 'string',
        'string[]': 'vector<string>',
        'boolean': 'bool',
        'boolean[]': 'vector<bool>'
    };
    return typeMap[type] || 'string';
};

const generateSource = (code, problem) => {
    let argDecls = '';
    let argReads = '';
    let argNames = [];
    
    problem.parameters.forEach((p, i) => {
        const cppType = mapToCppType(p.type);
        
        argDecls += `    ${cppType} arg${i};\n`;
        argReads += `    cin >> arg${i};\n`;
        argNames.push(`arg${i}`);
    });

    return `
#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

// Array Parsers
template <typename T>
istream& operator>>(istream& is, vector<T>& v) {
    char ch; while (is >> ch && ch != '[') {}
    T val; while (is >> val) { v.push_back(val); is >> ch; if (ch == ']') break; }
    if (is.fail()) { is.clear(); is >> ch; }
    return is;
}

template <typename T>
ostream& operator<<(ostream& os, const vector<T>& v) {
    os << "["; for (size_t i = 0; i < v.size(); ++i) os << v[i] << (i == v.size() - 1 ? "" : ", "); os << "]"; return os;
}

${code}

int main() {
${argDecls}
${argReads}
    
    ${problem.className} solution;
    auto result = solution.${problem.functionName}(${argNames.join(', ')});
    
    cout << result << endl;
    return 0;
}
`;
};

const validateSubmission = (code) => {
    if (!code) throw new Error("Code is empty");
    return true;
};

const getCompileCommand = () => ['g++', '-O2', '-std=c++17', config.sourceFile, '-o', config.binaryFile];

const getRunCommand = () => [`./${config.binaryFile}`];

module.exports = {
    ...config,
    generateSource,
    validateSubmission,
    getCompileCommand,
    getRunCommand
};
