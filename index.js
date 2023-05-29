const fs = require('fs');
const execSync = require('child_process').execFileSync;
const glob = require('glob');

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
    fs.mkdirSync(baseExtractDir + baseDiskName, {
        recursive: true
    }, (err) => {});

    //extract files from diskimages
    execSync('bbcim.exe', ["-e", baseDisksDir + filename]);

    var extractedFiles = fs.readdirSync(baseDisksDir).filter(fn => fn.startsWith(filename + '.'));
    var keptFiles = [];
    var keptSizes = [];
    extractedFiles.forEach(exfilename => {
        if (exfilename.endsWith('$.!BOOT') || exfilename.endsWith('$.!BOOT.inf') || exfilename.endsWith('.cat')) {
            fs.unlinkSync(baseDisksDir + exfilename, function (err) {
                if (err) throw err
            });
        } else {
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

    disksJsonData.push({
        name: baseDiskName,
        fileCount: keptFiles.length,
        files: keptFiles,
        sizes: keptSizes
    });
});


let jsonData = JSON.stringify(disksJsonData);
fs.writeFileSync(baseExtractDir + 'disks.json', jsonData, err => {
    if (err) {
        console.error(err)
        return
    }
});





// function deleteFile(file) {
//     return new Promise((resolve, reject) => {
//         fs.unlink(file, (err) => {
//             if (err) reject(err);
//             resolve(`Deleted ${file}`)
//         })
//     })
// }