const fs = require('fs');
const execSync = require('child_process').execFileSync;

const assetDir = './assets/';
const baseDisksDir = assetDir + 'disks/';
const baseExtractDir = assetDir + 'extract/';

let disksArray = [];
let disksJsonData = [];

let files = fs.readdirSync(baseDisksDir).filter(fn => fn.endsWith('.ssd'));
files.forEach(filename => {
    let baseDiskName = filename.replace('.ssd', '');
    disksArray.push(baseDiskName);

    //create destination dir
    fs.mkdirSync(baseExtractDir + baseDiskName, { recursive: true }, (err) => {
        if (err) throw err
    });

    //extract files from diskimages
    execSync('bbcim.exe', ["-e", baseDisksDir + filename]); //requires use of third-party .exe

    //manipluate extracted files
    var extractedFiles = fs.readdirSync(baseDisksDir).filter(fn => fn.startsWith(filename + '.'));
    var keptFiles = [];
    var keptSizes = [];
    extractedFiles.forEach(exfilename => {
        //we don't want BOOT or cat files
        if (exfilename.endsWith('$.!BOOT') || exfilename.endsWith('$.!BOOT.inf') || exfilename.endsWith('.cat')) {
            fs.unlinkSync(baseDisksDir + exfilename, function (err) {
                if (err) throw err
            });
        } else {
            //analyse and store all other files
            var srcName = baseDisksDir + exfilename;
            if (!srcName.endsWith('.inf')) {
                var fileStats = fs.statSync(srcName);
                keptFiles.push(srcName);
                keptSizes.push(fileStats.size);
            }
            var destName = baseExtractDir + baseDiskName + '/' + exfilename.replace(filename + '.', '');
            fs.renameSync(srcName, destName);

        }
    });

    //store this disk's extracted files info.
    disksJsonData.push({
        name: baseDiskName,
        fileCount: keptFiles.length,
        files: keptFiles,
        sizes: keptSizes
    });
});

//create json file with disk info in it.
let jsonData = JSON.stringify(disksJsonData);
fs.writeFileSync(baseExtractDir + 'disks.json', jsonData, err => {
    if (err) {
        console.error(err)
        return
    }
});