const 
    fs = require('fs-extra'),
    path = require('path'),
    archiver = require('archiver');


/**
 * Gets an array of all files in a folder. Returns either full paths (default) or filenames.
 */
const readFilesInDirSync = function(dir, fullPath = true){
    let items = fs.readdirSync(dir)
        results = [];

    for(let item of items){
        if (!fs.lstatSync(path.join(dir, item)).isFile())
            continue;

        results.push(fullPath ? path.join(dir, item) : item);
    }

    return results;
}


/**
 * Gets an array of all files in a folder. Returns either full paths (default) or filenames.
 */
const readFilesInDir = async function(dir, fullPath = true){
    let items = fs.readdirSync(dir)
        results = [];

    for(let item of items){
        if (!(await fs.promises.lstat(path.join(dir, item))).isFile())
            continue;

        results.push(fullPath ? path.join(dir, item) : item);
    }

    return results;
}


/**
 * Gets all files nested under a path. 
 * Set fullpath to false for file names only. 
 * Extension mask can be a string or array of strings, must be fill extensions with leading dots.
 */
const readFilesUnderDirSync = function(dir, fullPath = true, extensionMask = []){
    let results = [];
    if (!extensionMask)
        extensionMask = [];

    if (typeof extensionMask === 'string')
        extensionMask= [extensionMask];

    function processDirectory(dir){

        let items = fs.readdirSync(dir)

        for (let item of items){
            let itemFullPath = path.join(dir, item);
            let stat = fs.lstatSync(itemFullPath);
            if (stat.isDirectory())
                processDirectory(itemFullPath);
            else if(stat.isFile()){
                if (extensionMask.length && !extensionMask.includes(path.extname(item)))
                    continue;
                results.push(fullPath ? itemFullPath : item);
            }
        }
    };

    processDirectory(dir)
    return results;
}


/**
 * Gets all files nested under a path. 
 * Set fullpath to false for file names only. 
 * Extension mask can be a string or array of strings, must be fill extensions with leading dots.
 */
const readFilesUnderDir = async function(dir, fullPath = true, extensionMask = []){
    let results = [];
    if (!extensionMask)
        extensionMask = [];

    if (typeof extensionMask === 'string')
        extensionMask= [extensionMask];

    async function processDirectory(dir){

        let items = await fs.promises.readdir(dir)

        for (let item of items){
            let itemFullPath = path.join(dir, item);
            let stat = await fs.promises.lstat(itemFullPath);
            if (stat.isDirectory())
                await processDirectory(itemFullPath);
            else if(stat.isFile()){
                if (extensionMask.length && !extensionMask.includes(path.extname(item)))
                    continue;
                results.push(fullPath ? itemFullPath : item);
            }
        }
    };

    await processDirectory(dir)
    return results;
}


/**
 * Deletes a file or an array of files. Fullpaths required. 
 */
const unlinkAllSync = function(files){
    if (typeof files === 'string') 
        files = [files];

    for (let file of files)
        fs.unlinkSync(file);
}


/**
 * Deletes a file or an array of files. Fullpaths required. 
 */
const unlinkAll = async function(files){
    if (typeof files === 'string') 
        files = [files];

    for (let file of files)
        await fs.promises.unlink(file);
}


/**
 * Zips a directory and its contents.
 */
const zipDir = async function(inPath, outPath){

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


/** 
 * Extracts filename without extension from full path
 */
const fileNameWithoutExtension = function(fullPath){
    return path.basename(fullPath, path.extname(fullPath));
}


/** 
 * Extracts full path without extension from raw full path. This is useful for dynamically loading modules from 
 * a filesystem file lookup list.
 */
const fullPathWithoutExtension = function(fullPath){
    return path.join(path.dirname(fullPath), fileNameWithoutExtension(fullPath));
}


module.exports = {
    fullPathWithoutExtension,
    fileNameWithoutExtension,
    zipDir,
    unlinkAll,
    unlinkAllSync,
    readFilesInDir,
    readFilesInDirSync,
    readFilesUnderDir,
    readFilesUnderDirSync
}
