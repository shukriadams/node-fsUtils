let fs = require('fs-extra'),
    archiver = require('archiver');

/**
 * Zips a directory and its contents.
 */
let zipDir = async function(inPath, outPath){

    return new Promise(function(resolve, reject){
        try {

            var output = fs.createWriteStream(outPath);
            var archive = archiver('zip', {
                zlib: { level: 5 } 
            });

            output.on('close', function() {
                resolve();
            });

            output.on('end', function() {
                // alert on draining done here
            });

            archive.on('warning', function(err) {
                if (err.code === 'ENOENT') {
                    console.log(err);
                } else {
                    reject(err);
                }
            });

            archive.on('error', function(err) {
                reject(err);
            });

            archive.pipe(output);
            archive.directory(inPath, false);
            archive.finalize();

        } catch(ex){
            reject(ex);
        }
    });
}

module.exports = {
    zipDir
}
