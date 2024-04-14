const fs = require('fs');
const execSync = require('child_process').execFileSync;

const exportDir = './export/'
const mmbFile = exportDir + "reMastered.mmb"
let maxSlots = 288;

//create new mmb file
execSync('mmbexplorer.exe', ["create", mmbFile, maxSlots]);

let files = fs.readdirSync(exportDir).filter(fn => fn.endsWith('.ssd'));
files.forEach(disk => {
    // console.log(disk);
    let partialFilename = disk.slice(0, -4);
    let slotNumber = parseInt(partialFilename.slice(-3));
    console.log('SLOT #' + slotNumber + ' = ' + disk)
    execSync('mmbexplorer.exe', ["add", mmbFile, exportDir + disk, slotNumber]);
});

