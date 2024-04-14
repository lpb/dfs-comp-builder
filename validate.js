const fs = require('fs');
const csvtojson = require('csvtojson');
const assetDir = './assets/';
const baseExtractDir = assetDir + 'extract/';
const datPubFile = assetDir + 'data/publishersToUse.csv';


console.log("=====================================");
//read#in config files for desired publisher combinations
csvtojson({
    noheader: true,
    headers: ['title', 'publisher', 'program', 'compilation', 'side', 'method', 'menutitle']
})
.fromFile(datPubFile)
.then((jsonObj) => {
    jsonObj.forEach(title => {
        let gameName = title.title.replaceAll(' ', '').replaceAll('\'', '').replaceAll('-', '').replaceAll('_', '')
        let pubDir = title.publisher.replaceAll(' ', '').replaceAll('\'', '').replaceAll('-', '').replaceAll('_', '')
        // console.log(pubDir);
        let fullfileName = baseExtractDir + pubDir + "/" + gameName + "/$." + title.program;
        // console.log(fullfileName);
        if (fs.existsSync(fullfileName)) {
            
        } else {
            console.log(pubDir + '/' + gameName + ' has errors with ' + title.program)
        }
    });
})