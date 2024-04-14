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
let gameCount = [];
let publisherList = [];
let themes = [];
let gotekDiskNames = "DSKA";
let dataChunk = "";
let basicLineNumber = 810;
let compilationNumber = 1;

const numberArray = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const zeroPad = (num, places) => String(num).padStart(places, '0');

const doDisks = true; //true;
const doCombine = true;

//load themes json file
let themesData = fs.readFileSync(datThemeFiles, 'utf8', );
themes = JSON.parse(themesData);

//read in config files for desired publisher combinations
csvtojson({
        noheader: true,
        headers: ['title', 'publisher', 'program', 'compilation', 'side', 'method', 'menutitle','NIU','shortname','slot']
    })
    .fromFile(datPubFile)
    .then((jsonObj) => {
        compilationJsonData = jsonObj;

        //create list of all publishers
        compilationJsonData.forEach(title => {
            if (!publisherList.includes(title.publisher)) {
                publisherList.push(title.publisher);
            }
        });

        publisherList.forEach(publisher => {

            //get entries for specific publisher
            let compFilters = {
                publisher: publisher
            };
            thisPublisher = compilationJsonData.filter(item => Object.keys(compFilters).every(key => item[key] === compFilters[key]));

            //build up BASIC DATA statements for this publisher
            let basicLineNumber = 810;
            let dataChunk = '';
            let shortname = '';

            thisPublisher.forEach(publisherGame => {
                if(publisherGame.menutitle) {
                    dataBit = "DATA " + publisherGame.menutitle + "," + publisherGame.program + "," + publisherGame.slot + "," + "," + publisherGame.method;
                } else {
                    dataBit = "DATA " + publisherGame.title + "," + publisherGame.program + "," + publisherGame.slot + "," + "," + publisherGame.method;
                }
                dataChunk += basicLineNumber + dataBit + "\n";
                basicLineNumber += 10;
                shortname = publisherGame.shortname;
            });

            //load up theme data
            let themeFilters = {
                name: publisher.replaceAll(' ', '').replaceAll('\'', '')
            };
            let themeToUse = themes.filter(item => Object.keys(themeFilters).every(key => item[key] === themeFilters[key]))[0];
            let defaultfilter = {
                name: "default"
            }
            let defaultThemeToUse = themes.filter(item => Object.keys(defaultfilter).every(key => item[key] === defaultfilter[key]))[0];

            //create default theme for any that are missing settings
            if (!themeToUse) {
                themeToUse = defaultThemeToUse
            }

            //generate menu program basic
            let basicOutput = fs.readFileSync(assetDir + 'basic/gotek/!MENUMMB.bas', 'utf-8');
            dataChunk = dataChunk + basicLineNumber + "ENDPROC\n";
            let publisherName = publisher.replaceAll(' ', '').replaceAll('\'', '').substring(0, 6) + publisher.slice(-1);
            // console.log(publisherName);
            basicOutput = basicOutput.replace('{name}', publisher);
            basicOutput = basicOutput.replace('{background}', themeToUse.background);
            basicOutput = basicOutput.replace('{foreground}', themeToUse.foreground);
            basicOutput = basicOutput.replace('{text1}', themeToUse.text1);
            basicOutput = basicOutput.replace('{text2}', themeToUse.text2);
            basicOutput = basicOutput.replace('{gameCount}', thisPublisher.length);
            basicOutput = basicOutput.replace('{volumeTitle}', '');
            basicOutput = basicOutput.replace('{data}', dataChunk);

            fs.writeFileSync(tempDir + publisher + '!MENU.bas', basicOutput, 'utf-8');
            execSync('basictool.exe', ["-p", "--pack-rems-n", "-r", "-t", tempDir + publisher + '!MENU.bas', "M." + publisherName]);

            pubMenuObj = {
                publisher: publisher,
                filename: "M." + publisherName,
                diskNumber: 0,
                diskSide: 0,
                shortname: shortname
            }

            compilationData.push(pubMenuObj);
        });


        // build catalogue disks
        let menuDiskCompStart = 272;
        let menuDiskMaxFiles = 28;
        let diskSide = 0;
        let diskSideCount = 0;
        let compNameBuild = gotekDiskNames + zeroPad(menuDiskCompStart, 4);

        // if (doDisks) {
        //     execSync('bbcim.exe', ["-a", compNameBuild, "./assets/basic/$.!BOOT"]);
        // }

        let files = fs.readdirSync('./').filter(fn => fn.startsWith('M.'));
        let discFileCount = 0;
        // console.log(files.length);
        files.forEach(filename => {
            discFileCount++;
            if (discFileCount > menuDiskMaxFiles) {
                discFileCount = 0;
                diskSideCount = 0;
                menuDiskCompStart++;
                diskSide = 0;
            }
            compNameBuild = gotekDiskNames + zeroPad(menuDiskCompStart, 4);
            execSync('bbcim.exe', ["-ab", exportDir + compNameBuild + "_" + diskSide + ".ssd", filename]);
            fs.unlinkSync(filename);

            let menuFilters = {
                filename: filename
            };
            let publisherMenu = compilationData.filter(item => Object.keys(menuFilters).every(key => item[key] === menuFilters[key]));
            if (publisherMenu[0]) {
                publisherMenu[0].diskNumber = menuDiskCompStart;
                publisherMenu[0].diskSide = diskSide;
            }

        });

        let diskCompFiles = fs.readdirSync(exportDir).filter(fn => fn.endsWith('.ssd'));
        diskCompFiles.forEach(filename => {
            let partialFilename = filename.slice(0, -6);
            let slotNumber = partialFilename.slice(-3);

            if ((fs.existsSync(exportDir + partialFilename + "_0.ssd"))) {
                if (doDisks) {
                    execSync('bbcim.exe', ["-a", exportDir + partialFilename + "_0.ssd", "./assets/basic/din/$.!BOOT"]);
                    execSync('bbcim.exe', ["-a", exportDir + partialFilename + "_0.ssd", "./assets/basic/din/$.din"]);
                }
            }
            if (fs.existsSync(exportDir + partialFilename + "_0.ssd") && fs.existsSync(exportDir + partialFilename + "_2.ssd")) {
                if (doDisks) {
                    execSync('bbcim.exe', ["-interss", "sd", exportDir + partialFilename + "_0.ssd", exportDir + partialFilename + "_2.ssd", exportDir + partialFilename + ".dsd"]);
                    fs.unlinkSync(exportDir + partialFilename + "_0.ssd");
                    fs.unlinkSync(exportDir + partialFilename + "_2.ssd");
                }
            } else if (fs.existsSync(exportDir + partialFilename + "_0.ssd")) {
                fs.renameSync(exportDir + partialFilename + "_0.ssd", exportDir + partialFilename + ".ssd");
                execSync('mmbexplorer.exe', ["add", exportDir + "reMastered.mmb", exportDir + partialFilename + ".ssd", slotNumber]);
            }

        });


        // console.log(compilationData);

        //build master gotek menu DATA
        //generate menu program basic
        let mbasicOutput = fs.readFileSync(assetDir + 'basic/gotek/!MEGAMENU.bas', 'utf-8');

        //create DATA statements for games list
        let mbasicLineNumber = 800;
        let mdataChunk = "";
        let mdataBit = "";
        compilationData.sort(function (a, b) {
            return a.publisher - b.publisher
        });
        compilationData.forEach(pubData => {
            // console.log(pubData);
            mdataBit = "DATA " + pubData.shortname + "," + pubData.filename + "," + pubData.diskNumber + "," + pubData.diskSide;
            mdataChunk += mbasicLineNumber + mdataBit + "\n";
            mbasicLineNumber += 10;
        });
        mdataChunk = mdataChunk + mbasicLineNumber + "ENDPROC\n";

        // console.log(mdataChunk);

        mbasicOutput = mbasicOutput.replace('{name}', "BBC Games");
        mbasicOutput = mbasicOutput.replace('{background}', 129);
        mbasicOutput = mbasicOutput.replace('{foreground}', 131);6
        mbasicOutput = mbasicOutput.replace('{text1}', 135);
        mbasicOutput = mbasicOutput.replace('{text2}', 134);
        mbasicOutput = mbasicOutput.replace('{gameCount}', compilationData.length);
        mbasicOutput = mbasicOutput.replace('{volumeTitle}', '');
        mbasicOutput = mbasicOutput.replace('{data}', mdataChunk);

        console.log(mbasicOutput);

        fs.writeFileSync(tempDir + '!MENU.bas', mbasicOutput, 'utf-8');

        // execSync('basictool.exe', ["-p", "--pack-rems-n", "-r", "-t", tempDir + '!MENU.bas', "$.!MENU"]);
        // if (doDisks) {
        //     execSync('bbcim.exe', ["-ab", exportDir + "DSKA0900.dsd", "$.!MENU"]);
        //     fs.unlinkSync("$.!MENU");
        // }
    });