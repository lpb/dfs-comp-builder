const fs = require('fs');
const execSync = require('child_process').execFileSync;

const assetDir = './assets/';
const baseDisksDir = assetDir + 'disks/';
const baseExtractDir = assetDir + 'extract/';
const disksJsonFile = assetDir + 'data/disks.json';

let disksArray = [];
let disksJsonData = [];

let files = fs.readdirSync(baseDisksDir);
files.forEach(publisher => {
    if (fs.lstatSync(baseDisksDir + publisher).isDirectory()) {

        let srcDir = baseDisksDir + publisher + "/";
        let destDir = baseExtractDir + publisher + "/";

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir);
        }

        if (true) {
            //manipulate archives diskimages
            let files = fs.readdirSync(srcDir).filter(fn => fn.endsWith('.ssd'));
            files.forEach(filename => {

                let baseDiskName = filename.replace('.ssd', '');
                disksArray.push(baseDiskName);

                //create destination dir
                if (!fs.existsSync(destDir + baseDiskName)) {
                    fs.mkdirSync(destDir + baseDiskName);
                }

                // console.log(srcDir + filename);
                //extract files from diskimages
                if ( (!fs.existsSync(srcDir + filename + ".cat")) || (!fs.existsSync(srcDir + filename + ".$.!BOOT")) ) {
                    execSync('bbcim.exe', ["-e", srcDir + filename]); //requires use of third-party .exe
                } else {
                    // console.log(srcDir + filename + ".cat");
                    // console.log(fs.existsSync(srcDir + filename + ".cat"));
                    // console.log(srcDir + filename + ".$.!BOOT");
                    // console.log(fs.existsSync(srcDir + filename + ".$.!BOOT"));
                    // process.exit();
                }

                // process.exit();
                //manipluate extracted files
                var extractedFiles = fs.readdirSync(srcDir).filter(fn => fn.startsWith(filename + '.'));
                var keptFiles = [];
                var keptSizes = [];
                var totalGameSize = 0;

                extractedFiles.forEach(exfilename => {
                    //we don't want BOOT or cat files
                    if (exfilename.endsWith('.cat')) {
                        // fs.unlinkSync(srcDir + exfilename, function (err) {
                        //     if (err) throw err
                        // });
                    } else {
                        //analyse and store all other files
                        var srcName = srcDir + exfilename;
                        if (!srcName.endsWith('.inf') && !srcName.endsWith('$.!BOOT')) {
                            var fileStats = fs.statSync(srcName);
                            var destName = destDir + baseDiskName + '/' + exfilename.replace(filename + '.', '');
                            keptFiles.push(destName);
                            keptSizes.push(fileStats.size);
                        }
                        var destName = destDir + baseDiskName + '/' + exfilename.replace(filename + '.', '');
                        fs.copyFileSync(srcName, destName);

                        totalGameSize = keptSizes.reduce((a, b) => a + b, 0);
                    }
                });

                //store this disk's extracted files info.
                disksJsonData.push({
                    name: baseDiskName,
                    publisher: publisher,
                    fileCount: keptFiles.length,
                    allFiles: keptFiles,
                    allSizes: keptSizes,
                    totalGameSize: totalGameSize
                });
            });
        }
    };
});

//create json file with disk info in it.
let jsonData = JSON.stringify(disksJsonData);
fs.writeFileSync(disksJsonFile, jsonData, err => {
    if (err) {
        console.error(err)
        return
    }
});