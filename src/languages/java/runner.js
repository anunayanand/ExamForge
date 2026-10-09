const config = require('./config');

const mapToJavaType = (type) => {
    const typeMap = {
        'integer': 'int',
        'integer[]': 'int[]',
        'integer[][]': 'int[][]',
        'string': 'String',
        'string[]': 'String[]',
        'boolean': 'boolean',
        'boolean[]': 'boolean[]'
    };
    return typeMap[type] || 'String';
};

const generateSource = (code, problem) => {
    let argDecls = '';
    let argNames = [];
    
    problem.parameters.forEach((p, i) => {
        const javaType = mapToJavaType(p.type);
        if (javaType === 'int[]') {
            argDecls += `        int[] arg${i} = parseArray(scanner.nextLine());\n`;
        } else if (javaType === 'int[][]') {
            argDecls += `        int[][] arg${i} = parseIntMatrix(scanner.nextLine());\n`;
        } else if (javaType === 'int') {
            argDecls += `        int arg${i} = Integer.parseInt(scanner.nextLine().trim());\n`;
        } else if (javaType === 'boolean') {
            argDecls += `        boolean arg${i} = Boolean.parseBoolean(scanner.nextLine().trim());\n`;
        } else {
            argDecls += `        ${javaType} arg${i} = scanner.nextLine();\n`;
        }
        argNames.push(`arg${i}`);
    });

    return `
import java.util.*;
import java.io.*;

class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

${code}

public class Main {
    public static int[] parseArray(String line) {
        line = line.trim();
        if (line.equals("[]")) return new int[0];
        line = line.substring(1, line.length() - 1); // Remove [ and ]
        String[] parts = line.split(",");
        int[] arr = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            arr[i] = Integer.parseInt(parts[i].trim());
        }
        return arr;
    }

    public static int[][] parseIntMatrix(String s) {
        s = s.trim();
        if (s.length() <= 2) return new int[0][0];
        s = s.substring(1, s.length() - 1).trim();
        if (s.length() == 0) return new int[0][0];
        
        List<int[]> rowList = new ArrayList<>();
        int i = 0;
        while (i < s.length()) {
            if (s.charAt(i) == '[') {
                int j = i + 1;
                while (j < s.length() && s.charAt(j) != ']') j++;
                String rowStr = s.substring(i + 1, j);
                if (rowStr.trim().isEmpty()) {
                    rowList.add(new int[0]);
                } else {
                    String[] parts = rowStr.split(",");
                    int[] row = new int[parts.length];
                    for(int k=0; k<parts.length; k++) {
                        row[k] = Integer.parseInt(parts[k].trim());
                    }
                    rowList.add(row);
                }
                i = j + 1;
            } else {
                i++;
            }
        }
        int[][] res = new int[rowList.size()][];
        for(int k=0; k<rowList.size(); k++) res[k] = rowList.get(k);
        return res;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
${argDecls}
        
        ${problem.className} solution = new ${problem.className}();
        Object result = solution.${problem.functionName}(${argNames.join(', ')});
        
        if (result instanceof int[]) {
            System.out.println(Arrays.toString((int[])result));
        } else if (result instanceof int[][]) {
            System.out.println(Arrays.deepToString((int[][])result));
        } else {
            System.out.println(result);
        }
    }
}
`;
};

const validateSubmission = (code) => {
    if (!code) throw new Error("Code is empty");
    return true;
};

const getCompileCommand = () => ['javac', config.sourceFile];

const getRunCommand = () => ['java', 'Main'];

module.exports = {
    ...config,
    generateSource,
    validateSubmission,
    getCompileCommand,
    getRunCommand
};
