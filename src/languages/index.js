const pythonAdapter = require('./python/runner');
const cppAdapter = require('./cpp/runner');
const javaAdapter = require('./java/runner');

module.exports = {
    python: pythonAdapter,
    cpp: cppAdapter,
    java: javaAdapter
};
