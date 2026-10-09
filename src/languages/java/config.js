const config = require('../../config/env');

module.exports = {
    language: 'java',
    runnerVersion: '1.0.0',
    compilerVersion: '21',
    image: config.javaImage,
    sourceFile: 'Main.java'
};
