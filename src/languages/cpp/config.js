const config = require('../../config/env');

module.exports = {
    language: 'cpp',
    runnerVersion: '1.0.0',
    compilerVersion: '13',
    image: config.cppImage,
    sourceFile: 'Main.cpp',
    binaryFile: 'solution'
};
