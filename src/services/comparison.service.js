class ComparisonService {
    compare(actual, expected, mode = 'normalized') {
        if (mode === 'normalized') {
            return this._normalize(actual) === this._normalize(expected);
        }
        return actual === expected;
    }

    _normalize(str) {
        if (typeof str !== 'string') return String(str);
        return str
            .replace(/\r\n/g, '\n') // Normalize newlines
            .split('\n')
            .map(line => line.trimEnd()) // Strip trailing spaces per line
            .join('\n')
            .trim(); // Trim overall whitespace
    }
}

module.exports = new ComparisonService();
