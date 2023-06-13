const fs = require('fs');

const assetDir = './assets/';
const baseDisksDir = assetDir + 'disks/';
const exportDir = './export/';
const tempDir = './temp/';

let tempFiles = fs.readdirSync(tempDir);
tempFiles.forEach(path => fs.existsSync(tempDir+path) && fs.unlinkSync(tempDir+path));

let exportFiles = fs.readdirSync(exportDir);
exportFiles.forEach(path => fs.existsSync(exportDir+path) && fs.unlinkSync(exportDir+path));