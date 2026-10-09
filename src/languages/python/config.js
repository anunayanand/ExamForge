const config = require('../../config/env');

module.exports = {
    language: 'python',
    runnerVersion: '1.0.0',
    compilerVersion: '3.12',
    image: config.pythonImage,
    sourceFile: 'main.py'
};
