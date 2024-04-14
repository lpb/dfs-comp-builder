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
let compilationData = [];
let publisherList = [];
let themes = [];
let numberArray = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const doDisks = true;


//read in config files for desired publisher combinations
csvtojson({
        noheader: true,
        headers: ['title', 'publisher', 'program', 'compilation', 'side', 'method', 'menutitle']
    })
    .fromFile(datPubFile)
    .then((jsonObj) => {
        compilationJsonData = jsonObj;

        //build publisher data
        compilationJsonData.forEach(title => {
            if (!publisherList.includes(title.publisher)) {
                publisherList.push(title.publisher);
            }
        });

        //build compilations data
        let filters = false;
        let filteredArray = false;
        let minElement = 0;
        let maxElement = 0;
        publisherList.forEach(publisherName => {
            filters = {
                publisher: publisherName
            };
            filteredArray = compilationJsonData.filter(item => Object.keys(filters).every(key => item[key] === filters[key]));

            compilationNumberArray = [];
            filteredArray.forEach(game => {
                compilationNumberArray.push(parseInt(game.compilation));
            });
            minElement = compilationNumberArray.reduce((a, b) => {
                return Math.min(a, b);
            });
            maxElement = compilationNumberArray.reduce((a, b) => {
                return Math.max(a, b);
            });

            let compilationPartData = [];
            for (i = minElement; i <= maxElement; i++) {
                filters = {
                    compilation: String(i)
                }
                filteredByComp = filteredArray.filter(item => Object.keys(filters).every(key => item[key] === filters[key]));
                sidefilters = {
                    side: '0'
                }
                filteredCompBySide0 = filteredByComp.filter(item => Object.keys(sidefilters).every(key => item[key] === sidefilters[key]));
                sidefilters = {
                    side: '2'
                }
                filteredCompBySide2 = filteredByComp.filter(item => Object.keys(sidefilters).every(key => item[key] === sidefilters[key]));

                compilationPartData[i - minElement] = {
                    volume: i - minElement + 1,
                    content: {
                        side0: filteredCompBySide0,
                        size0: filteredCompBySide0.length,
                        side2: filteredCompBySide2,
                        size2: filteredCompBySide2.length,
                        all: filteredByComp,
                        size: filteredByComp.length
                    }
                }

            }

            publisherCompilationObj = {
                title: publisherName,
                disks: (maxElement - minElement) + 1,
                firstDisk: minElement,
                lastDisk: maxElement,
                compilations: compilationPartData
            };
            compilationData.push(publisherCompilationObj);
        });

        let jsonData = JSON.stringify(compilationData);
        fs.writeFileSync(compilationJsonFile, jsonData);

        //read disks.json created by extractdisks.js
        let disksData = fs.readFileSync(disksJsonFile, 'utf8', );
        disksJsonData = JSON.parse(disksData);

        //load themes json file
        let themesData = fs.readFileSync(datThemeFiles, 'utf8', );
        themes = JSON.parse(themesData);

        // console.log(disksJsonData);

        //do main data gen loop
        compilationData.forEach(compilation => {

            compilationVolumes = compilation.compilations;
            compilationVolumes.forEach(volume => {

                let compilationTitleCleaned = compilation.title.replaceAll(' ', '').replaceAll('\'', '');

                if (volume.content.size0 && volume.content.size0 > 0) {
                    compNameBuild = exportDir + compilationTitleCleaned + volume.volume + "_0.ssd";

                    //add !BOOT file to side 0 disk images
                    if (doDisks) {
                        execSync('bbcim.exe', ["-a", compNameBuild, "./assets/basic/$.!BOOT"]);
                    }
                    // if (doDisks) {
                    //     execSync('bbcim.exe', ["-80", compNameBuild]);
                    // } //ensure 80 track is still correct 

                    //match content entry against disks.json
                    volume.content.side0.forEach(game => {

                        let gamefilters = {
                            name: game.title.replaceAll(' ', '').replaceAll('\'', '').replaceAll('-', '').replaceAll('_', ''),
                            publisher: compilation.title.replaceAll(' ', '').replaceAll('\'', ''),
                        };
                        var gameFilteredArray = disksJsonData.filter(item => Object.keys(gamefilters).every(key => item[key] === gamefilters[key]))[0];

                        if (gameFilteredArray) {
                            // write the games files to the new disk image. 
                            // TODO CHECK why null elements in this array.
                            gameFilteredArray.allFiles.forEach(filename => {
                                // console.log(filename);
                                if (doDisks) {
                                    execSync('bbcim.exe', ["-a", compNameBuild, filename]);
                                }
                            });
                            //disc format gets choppy after adding files? this forces it back to 80track format.
                            // if (doDisks) {
                            //     execSync('bbcim.exe', ["-80", compNameBuild]);
                            // }
                        }

                    });
                }


                if (volume.content.size2 && volume.content.size2 > 0) {
                    compNameBuild = exportDir + compilationTitleCleaned + volume.volume + "_2.ssd";

                    volume.content.side2.forEach(game => {

                        // dataChunk += basicLineNumber + game.datatype1 + "\n";
                        // basicLineNumber += 10;

                        let gamefilters = {
                            name: game.title.replaceAll(' ', '').replaceAll('\'', '').replaceAll('-', '').replaceAll('_', ''),
                        };
                        var gameFilteredArray = disksJsonData.filter(item => Object.keys(gamefilters).every(key => item[key] === gamefilters[key]))[0];

                        if (gameFilteredArray) {
                            // console.log(gameFilteredArray[0].allFiles);
                            // write the games files to the new disk image. 
                            // TODO CHECK why null elements in this array.
                            if(gameFilteredArray.allFiles) {
                                gameFilteredArray.allFiles.forEach(filename => {
                                    // console.log(filename);
                                    if (doDisks) {
                                        execSync('bbcim.exe', ["-a", compNameBuild, filename]);
                                    }
                                });
                            }
                            //disc format gets choppy after adding files? this forces it back to 80track format.
                            if (doDisks) {
                                execSync('bbcim.exe', ["-80", compNameBuild]);
                            }
                        }

                    });
                }

                //load up theme data
                let themefilters = {
                    name: compilation.title.replaceAll(' ', '').replaceAll('\'', '')
                };
                let themeToUse = themes.filter(item => Object.keys(themefilters).every(key => item[key] === themefilters[key]))[0];
                let defaultfilter = {
                    name: "default"
                }
                let defaultThemeToUse = themes.filter(item => Object.keys(defaultfilter).every(key => item[key] === defaultfilter[key]))[0];

                //create default theme for any that are missing settings
                if (!themeToUse) {
                    themeToUse = defaultThemeToUse
                }

                //generate menu program basic
                let basicOutput = fs.readFileSync(assetDir + 'basic/!MENU.bas', 'utf-8');
                let compGameCount = volume.content.size0 + volume.content.size2;

                //create DATA statements for games list
                let basicLineNumber = 810;
                let dataChunk = "";
                let dataBit = "";
                let volumeLabel = "";

                volume.content.all.forEach(gameData => {
                    // console.log(gameData.title);
                    if(gameData.menutitle) {
                        dataBit = "DATA " + gameData.menutitle + "," + gameData.program + "," + gameData.compilation + "," + gameData.side + "," + gameData.method;
                    } else {
                        dataBit = "DATA " + gameData.title + "," + gameData.program + "," + gameData.compilation + "," + gameData.side + "," + gameData.method;
                    };
                    dataChunk += basicLineNumber + dataBit + "\n";
                    basicLineNumber += 10;
                });
                dataChunk = dataChunk + basicLineNumber + "ENDPROC\n";

                // console.log(themeToUse);
                if(compilationVolumes.length > 1) {
                    volumeLabel = ' Volume ' + numberArray[volume.volume];
                } else {
                    volumeLabel = '';
                }

                basicOutput = basicOutput.replace('{name}', compilation.title);
                basicOutput = basicOutput.replace('{background}', themeToUse.background);
                basicOutput = basicOutput.replace('{foreground}', themeToUse.foreground);
                basicOutput = basicOutput.replace('{text1}', themeToUse.text1);
                basicOutput = basicOutput.replace('{text2}', themeToUse.text2);
                basicOutput = basicOutput.replace('{gameCount}', compGameCount);
                basicOutput = basicOutput.replace('{volumeTitle}', volumeLabel);
                basicOutput = basicOutput.replace('{data}', dataChunk);

                fs.writeFileSync(tempDir + compilationTitleCleaned + volume.volume + '!MENU.bas', basicOutput, 'utf-8');

                execSync('basictool.exe', ["-p", "--pack-rems-n", "-r", "-t", tempDir + compilationTitleCleaned + volume.volume + '!MENU.bas', "$.!MENU"]);
                if (doDisks) {
                    execSync('bbcim.exe', ["-ab", exportDir + compilationTitleCleaned + volume.volume + "_0.ssd", "$.!MENU"]);
                    fs.unlinkSync("$.!MENU");
                }

                //combine both (if exists) ssd into dsd
                if (fs.existsSync(exportDir + compilationTitleCleaned + volume.volume + "_0.ssd") && fs.existsSync(exportDir + compilationTitleCleaned + volume.volume + "_2.ssd")) {
                    if (doDisks) {
                        if (compilation.disks == 1) {
                            compilationFilenameNumber = '';
                        } else {
                            compilationFilenameNumber = volume.volume;
                        }
                        execSync('bbcim.exe', ["-interss", "sd", exportDir + compilationTitleCleaned + volume.volume + "_0.ssd", exportDir + compilationTitleCleaned + volume.volume + "_2.ssd", exportDir + compilationTitleCleaned + "_" + compilationFilenameNumber + ".dsd"]);
                        fs.unlinkSync(exportDir + compilationTitleCleaned + volume.volume + "_0.ssd");
                        fs.unlinkSync(exportDir + compilationTitleCleaned + volume.volume + "_2.ssd");
                        execSync('bbcim.exe', ["-min", exportDir + compilationTitleCleaned + "_" + compilationFilenameNumber + ".dsd"]);
                        fs.unlinkSync(exportDir + compilationTitleCleaned + "_" + compilationFilenameNumber + ".dsd~");

                    }
                } else if (fs.existsSync(exportDir + compilationTitleCleaned + volume.volume + "_0.ssd")) {
                    if (compilation.disks == 1) {
                        compilationFilenameNumber = '';
                    } else {
                        compilationFilenameNumber = volume.volume;
                    }
                    fs.renameSync(exportDir + compilationTitleCleaned + volume.volume + "_0.ssd", exportDir + compilationTitleCleaned + compilationFilenameNumber + ".ssd");
                    execSync('bbcim.exe', ["-min", exportDir + compilationTitleCleaned + compilationFilenameNumber + ".ssd"]);
                    fs.unlinkSync(exportDir + compilationTitleCleaned + compilationFilenameNumber + ".ssd~");
                }
            });


        });
    });