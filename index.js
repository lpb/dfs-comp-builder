const fs = require('fs');
const csvtojson = require('csvtojson');
const execSync = require('child_process').execFileSync;

const assetDir = './assets/';
const baseDisksDir = assetDir + 'disks/';
const baseExtractDir = assetDir + 'extract/';
const datPubFile = assetDir + 'publishers/publishers.csv';

let disksArray = [];
let disksJsonData = [];
let compDataArray = [];


//read in config files for desired publisher combinations

csvtojson({
        noheader: true,
        headers: ['title', 'publisher', 'program', 'compilation', 'side', 'method', 'datatype1', 'datatype2']
    })
    .fromFile(datPubFile)
    .then((jsonObj) => {
        compDataArray = jsonObj;

        //manipulate archives diskimages
        let files = fs.readdirSync(baseDisksDir).filter(fn => fn.endsWith('.ssd'));
        files.forEach(filename => {
            let baseDiskName = filename.replace('.ssd', '');
            disksArray.push(baseDiskName);

            //create destination dir
            fs.mkdirSync(baseExtractDir + baseDiskName, {
                recursive: true
            }, (err) => {
                if (err) throw err
            });

            //extract files from diskimages
            execSync('bbcim.exe', ["-e", baseDisksDir + filename]); //requires use of third-party .exe

            //manipluate extracted files
            var extractedFiles = fs.readdirSync(baseDisksDir).filter(fn => fn.startsWith(filename + '.'));
            var keptFiles = [];
            var keptSizes = [];
            var totalGameSize = 0;

            extractedFiles.forEach(exfilename => {
                //we don't want BOOT or cat files
                if (exfilename.endsWith('.cat')) {
                    fs.unlinkSync(baseDisksDir + exfilename, function (err) {
                        if (err) throw err
                    });
                } else {
                    //analyse and store all other files
                    var srcName = baseDisksDir + exfilename;
                    if (!srcName.endsWith('.inf') && !srcName.endsWith('$.!BOOT')) {
                        var fileStats = fs.statSync(srcName);
                        var destName = baseExtractDir + baseDiskName + '/' + exfilename.replace(filename + '.', '');
                        keptFiles.push(destName);
                        keptSizes.push(fileStats.size);
                    }
                    var destName = baseExtractDir + baseDiskName + '/' + exfilename.replace(filename + '.', '');
                    fs.renameSync(srcName, destName);

                    totalGameSize = keptSizes.reduce((a, b) => a + b, 0);
                }
            });

            //store this disk's extracted files info.
            disksJsonData.push({
                name: baseDiskName,
                fileCount: keptFiles.length,
                allFiles: keptFiles,
                allSizes: keptSizes,
                totalGameSize: totalGameSize
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

        //loop to add game files to a new compilation disk image.
        let firstDiskNumber = false;
        let compilationNameNumber = 1;
        compDataArray.forEach(game => {
            var diskName = game.title.replaceAll(' ', '').replaceAll('\'', '');
            if (fs.existsSync(baseExtractDir + diskName)) {
                if (!firstDiskNumber) {
                    firstDiskNumber = game.compilation;
                }
                compilationNameNumber = (parseInt(game.compilation) + 1) - parseInt(firstDiskNumber);

                disksJsonData.forEach(diskData => {
                    if (diskData.name.toLowerCase() == diskName.toLowerCase()) {
                        var compNameBuild = game.publisher + compilationNameNumber + "_" + game.side + ".ssd";
                        //write the games files to the new disk image.
                        diskData.allFiles.forEach(filename => {
                            console.log(filename);
                            execSync('bbcim.exe', ["-a", compNameBuild, filename]);
                        });
                        //disc format gets choppy after adding files, this forces it back to 80track format.
                        execSync('bbcim.exe', ["-80", compNameBuild])
                    }
                });
            } else {
                console.log('GAME FILES NOT FOUND FOR ' + diskName);
            }
        });
    })