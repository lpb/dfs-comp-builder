const fs = require('fs');
const csvtojson = require('csvtojson');
const execSync = require('child_process').execFileSync;

const assetDir = './assets/';
const baseExtractDir = assetDir + 'extract/';
const datPubFile = assetDir + 'data/publishersToUse.csv';
const compilationJsonFile = assetDir + 'data/compilationData.json';
const datThemeFiles = assetDir + 'data/themes.json';
const disksJsonFile = assetDir + 'data/disks.json';
const tempDir = './temp/';
const exportDir = './export/'

let disksJsonData = [];
let compilationJsonData = [];
let themes = [];
let gotekDiskNames = "DSKA";
let dataChunk = "";
let basicLineNumber = 680;
let compilationNumber = 1;

const numberArray = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const zeroPad = (num, places) => String(num).padStart(places, '0');

const doDisks = true; //true;
const doCombine = true;

//load themes json file
let themesData = fs.readFileSync(datThemeFiles, 'utf8', );
themes = JSON.parse(themesData);

//read disks.json created by extractdisks.js
let disksData = fs.readFileSync(disksJsonFile, 'utf8', );
disksJsonData = JSON.parse(disksData);

//read in config files for desired publisher combinations
csvtojson({
        noheader: true,
        headers: ['title', 'publisher', 'program', 'compilation', 'side', 'method']
    })
    .fromFile(datPubFile)
    .then((jsonObj) => {
        compilationJsonData = jsonObj;
        dataChunk = "";
        basicLineNumber = 730;

        for (i = 1; i <= 512; i++) {

            //get entries for specific compilation
            let compFilters = {
                compilation: i.toString()
            };
            thisCompilation = compilationJsonData.filter(item => Object.keys(compFilters).every(key => item[key] === compFilters[key]));
            // console.log(thisCompilation);

            thisCompilation.forEach(thisGame => {
                //gather info for compilation disk
                compNameBuild = gotekDiskNames + zeroPad(thisGame.compilation, 4);
                thisDisk = exportDir + compNameBuild + "_" + thisGame.side + ".ssd";

                //find games from this compilation
                let gameFilters = {
                    name: thisGame.title.replaceAll(' ', '').replaceAll('\'', ''),
                    publisher: thisGame.publisher.replaceAll(' ', '').replaceAll('\'', ''),
                };
                gameData = disksJsonData.filter(item => Object.keys(gameFilters).every(key => item[key] === gameFilters[key]))[0];

                //move game files to compilation disk
                if (gameData) {
                    gameData.allFiles.forEach(filename => {
                        if (doDisks) {
                            execSync('bbcim.exe', ["-a", thisDisk, filename]);
                        } else {
                            console.log("-a", thisDisk, filename);
                        }
                    });
                }
            });

            // console.log(dataChunk);

            compNameBuild = gotekDiskNames + zeroPad(i, 4);
            if (doDisks) {
                execSync('bbcim.exe', ["-a", exportDir + compNameBuild + "_0.ssd", "./assets/basic/din/$.!BOOT"]);
                execSync('bbcim.exe', ["-a", exportDir + compNameBuild + "_0.ssd", "./assets/basic/din/$.din"]);
            }

            //combine both (if exists) ssd into dsd
            if (fs.existsSync(exportDir + compNameBuild + "_0.ssd") && fs.existsSync(exportDir + compNameBuild + "_2.ssd")) {
                if (doDisks) {
                    execSync('bbcim.exe', ["-interss", "sd", exportDir + compNameBuild + "_0.ssd", exportDir + compNameBuild + "_2.ssd", exportDir + compNameBuild + ".dsd"]);
                    fs.unlinkSync(exportDir + compNameBuild + "_0.ssd");
                    fs.unlinkSync(exportDir + compNameBuild + "_2.ssd");

                }
            } else if (fs.existsSync(exportDir + compNameBuild + "_0.ssd")) {
                fs.renameSync(exportDir + compNameBuild + "_0.ssd", exportDir + compNameBuild + ".ssd");
            }

        }

    });