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
let basicLineNumber = 810;
let slotNumber = 1;

let compDiskStart = 001;
let compDiskEnd = 256;
let maxSlots = 288;

const zeroPad = (num, places) => String(num).padStart(places, '0');

const doDisks = true; //true;

//load themes json file
let themesData = fs.readFileSync(datThemeFiles, 'utf8', );
themes = JSON.parse(themesData);

//read disks.json created by extractdisks.js
let disksData = fs.readFileSync(disksJsonFile, 'utf8', );
disksJsonData = JSON.parse(disksData);

//create new mmb file
execSync('mmbexplorer.exe', ["create", exportDir + "reMastered.mmb", maxSlots]);

//read in config files for desired publisher combinations
csvtojson({
        noheader: true,
        headers: ['title', 'publisher', 'program', 'compilation', 'side', 'method','alttitle','type','shortpub','slot']
    })
    .fromFile(datPubFile)
    .then((jsonObj) => {
        compilationJsonData = jsonObj;
        dataChunk = "";
        basicLineNumber = 810;

        for (i = compDiskStart; i <= compDiskEnd; i++) {

            //get entries for specific compilation
            let compFilters = {
                slot: i.toString()
            };
            thisCompilation = compilationJsonData.filter(item => Object.keys(compFilters).every(key => item[key] === compFilters[key]));
            // console.log(thisCompilation);

            thisCompilation.forEach(thisGame => {
                if(thisGame.type!='dsd') { //temp HACK for dsd images
                    //gather info for compilation disk
                    compNameBuild = gotekDiskNames + zeroPad(thisGame.slot, 4);
                    thisDisk = exportDir + compNameBuild + ".ssd";

                    //find games from this compilation
                    let gameFilters = {
                        name: thisGame.title.replaceAll(' ', '').replaceAll('\'', '').replaceAll('-', '').replaceAll('_', ''),
                        publisher: thisGame.publisher.replaceAll(' ', '').replaceAll('\'', ''),
                    };
                    gameData = disksJsonData.filter(item => Object.keys(gameFilters).every(key => item[key].toLowerCase() === gameFilters[key].toLowerCase()))[0];

                    //move game files to compilation disk
                    if (gameData) {
                        // console.log(gameData);
                        gameData.allFiles.forEach(filename => {
                            if (doDisks) {
                                execSync('bbcim.exe', ["-a", thisDisk, filename]);
                            } else {
                                console.log("-a", thisDisk, filename);
                            }
                        });
                    } else {
                        console.log(gameFilters);
                        process.exit();
                    }
                }
            });

            // console.log(dataChunk);

            compNameBuild = gotekDiskNames + zeroPad(i, 4);

            if (doDisks) {
                execSync('bbcim.exe', ["-a", exportDir + compNameBuild + ".ssd", "./assets/basic/din/$.!BOOT"]);
                execSync('mmbexplorer.exe', ["add", exportDir + "reMastered.mmb", exportDir + compNameBuild + ".ssd", i]);
            }

        }

    });