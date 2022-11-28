const fs = require('fs-extra'),
    path = require('path')

module.exports = {
    
    
    /**
     * Converts a windows path to unix format
     */
    toUnixPath(winpath){
        return winpath.replace(/\\/g, '/')
    },
    
    
    /**
     * Concatenates all files found by "find" glob
     * find : glob string
     * output : path for output file
     */
     async bundle(find, output, globOptions = {}){
        return new Promise((resolve, reject)=>{
            try {
                const glob = require('glob'),
                    MultiStream = require('multistream'),
                    fs = require('fs') 

                glob(find, globOptions, (err, files) => {
                    if (err)
                        return reject(err)

                    let outStream = fs.createWriteStream(output),
                        streams = []

                    for (const file of files)
                        streams.push(fs.createReadStream(file))

                    new MultiStream(streams).pipe(outStream)
                    resolve(files)
                })
            } catch (ex){
                reject(ex)
            }
        })
    },


    /**
     * Reads and returns a section of a textfile. Returns empty string when the file is overrun.
     * untested
    */
     async readTextFileChunk(path, chunkIndex = 0, chunkSize = 1024){
        return new Promise((resolve, reject)=>{
            try {
                let fs = require('fs'),
                    data = '',
                    readStream = fs.createReadStream(path,{ highWaterMark: chunkIndex * chunkSize, encoding: 'utf8'})

                readStream.on('data', function(chunk) {
                    data += chunk;
                }).on('end', function() {
                    resolve(data) 
                })

            } catch(ex){
                reject(ex)
            }
        })        
    },

    
    /**
     * Walks through a file one line at a time.
     *
     * @param {string} Path to file to step through
     * @param {function} onLine : callback triggered per line read. Callback parameters are ({string} line, {function} resume), resume must be called to proceed to next line.
     * @returns {null} Exits when finished
     */
     async lineStepThroughFile(path, onLine){
        if (!path)
            throw  `path argument required`

        if (!onLine)
            throw `callback required`
            
        if (!fs.pathExists(path))
            throw `Path "${path}" does not exist`
            
        return new Promise((resolve, reject)=>{
            try {
                const lineReader = require('readline').createInterface({
                    input: require('fs').createReadStream(path)
                })

                lineReader.on('line', (line) => {

                    // send line back via callback, along with our own callback. Receiver must call this function to continue stepping
                    onLine(line, ()=>{
                        lineReader.resume()
                    })
                    
                    // pause reader, wait for our callback to resume
                    lineReader.pause()
                })

                lineReader.on('close', () =>{
                    resolve()
                })

            } catch(ex){
                reject(ex)
            }
        })
    },

    
    /**
     * Copies directry and all its content to target. Note : wrote this because I had problems with fs-extra's dir copy 
     * corrupting data in windows on vagrant.
     */
    async copyDirectory(source, target){
        const sourceFiles = await this.readFilesUnderDir(source)

        for (let sourceFile of sourceFiles){
            // get path under the root we're copying from
            sourceFile = sourceFile.replace(source, '')
            // calculate target path using path fragment under target root
            const sourceFileFull = path.join(source, sourceFile),
                targetPath = path.join(target, sourceFile)

            await fs.ensureDir(path.dirname(targetPath))
            fs.createReadStream(sourceFileFull).pipe(fs.createWriteStream(targetPath))
        }
    },


    /**
     * 
    */
     async unzipToDirectory(zipFile, toFolder){
        return new Promise(function(resolve, reject){
            try {
                const unzipLib = require('unzip-stream'),
                    unzipExtractor = unzipLib.Extract({ path: toFolder })

                unzipExtractor.on('error', (err)=>{
                    reject(err)
                })

                unzipExtractor.on('close', async ()=>{
                    resolve()
                })

                fs.createReadStream(zipFile).pipe(unzipExtractor)

            } catch(ex) {
                reject(ex)
            }
        })
    },


    /** 
     * Extracts full path without extension from raw full path. This is useful for dynamically loading modules from 
     * a filesystem file lookup list.
     */
    fullPathWithoutExtension(fullPath){
        return path.join(path.dirname(fullPath), this.fileNameWithoutExtension(fullPath));
    },


    /** 
     * Extracts filename without extension from full path
     */
    fileNameWithoutExtension(fullPath){
        return path.basename(fullPath, path.extname(fullPath));
    },


    /**
     * list immediate child directories of a given directory. Directories can be sorted by standard stat properties.
     */
     async getChildDirs(root, returnFullPath = true, sortBy = null){
        return new Promise(async (resolve, reject)=>{
            try {
                let results = []
                
                fs.readdir(root, async (err, items)=>{
                    if (err)
                        return reject(err)

                    for (const item of items){
                        const itemPath = path.join(root, item),
                            stat = await fs.lstat(itemPath)
                
                        if (!stat.isDirectory())
                            continue

                        results.push({ path : returnFullPath ? itemPath : item, sortBy : stat[sortBy] })
                    }

                    if (sortBy)
                        results = results.sort((a, b)=>{
                            return a.sortBy > b.sortBy ? 1 :
                                b.sortBy > a.sortBy ? -1 :
                                0
                        })

                    resolve(results.map(result => result.path))
                })

            } catch(ex) {
                reject(ex)
            }
        })
    },


    

    /**
     * Zips a directory and its contents.
     */
     async zipDir(inPath, outPath){

        return new Promise((resolve, reject)=>{
            try {

                const output = fs.createWriteStream(outPath),
                    archiver = require('archiver'),
                    archive = archiver('zip', {
                        zlib: { level: 5 } 
                    })

                output.on('close', ()=>{
                    resolve()
                })

                output.on('end', ()=>{
                    // alert on draining done here
                })

                archive.on('warning', (err)=>{
                    if (err.code === 'ENOENT') {
                        console.log(err)
                    } else {
                        reject(err)
                    }
                })

                archive.on('error', (err)=>{
                    reject(err)
                })

                archive.pipe(output)
                archive.directory(inPath, false)
                archive.finalize()

            } catch(ex){
                reject(ex)
            }
        })
    },


    /**
     * Deletes a file or an array of files. Fullpaths required. 
     */
     async unlinkAll(files){
        if (typeof files === 'string') 
            files = [files]

        for (let file of files)
            await fs.remove(file)
    },


    /**
     * Deletes a file or an array of files. Fullpaths required. 
     */
    unlinkAllSync(files){
        if (typeof files === 'string') 
            files = [files];

        for (let file of files)
            fs.unlinkSync(file)
    },


    /**
     * Gets an array of all files in a folder. Returns either full paths (default) or filenames.
     */
     async readFilesInDir(dir, fullPath = true){
        let items = fs.readdirSync(dir),
            results = []

        for(let item of items){
            if (!(await fs.lstat(path.join(dir, item))).isFile())
                continue

            results.push(fullPath ? path.join(dir, item) : item)
        }

        return results;
    },


    /**
     * Gets an array of all files in a folder. Returns either full paths (default) or filenames.
     */
    readFilesInDirSync(dir, fullPath = true){
        let items = fs.readdirSync(dir),
            results = []

        for(let item of items){
            if (!fs.lstatSync(path.join(dir, item)).isFile())
                continue

            results.push(fullPath ? path.join(dir, item) : item)
        }

        return results
    },


    /**
     * Gets all files nested under a path. 
     * Set fullpath to false for file names only. 
     * Extension mask can be a string or array of strings, must be fill extensions with leading dots.
     */
     async readFilesUnderDir(dir, fullPath = true, extensionMask = []){
        let results = []

        if (typeof extensionMask === 'string')
            extensionMask = [extensionMask]

        async function processDirectory(dir){

            let items = await fs.readdir(dir)

            for (let item of items){
                const itemFullPath = path.join(dir, item)
                    stat = await fs.lstat(itemFullPath)

                if (stat.isDirectory())
                    await processDirectory(itemFullPath)
                else if(stat.isFile()){
                    if (extensionMask.length && !extensionMask.includes(path.extname(item)))
                        continue

                    results.push(fullPath ? itemFullPath : item)
                }
            }
        }

        await processDirectory(dir)
        return results
    },


    /**
     * Gets all files nested under a path. 
     * Set fullpath to false for file names only. 
     * Extension mask can be a string or array of strings, must be fill extensions with leading dots.
     */
    readFilesUnderDirSync(dir, fullPath = true, extensionMask = []){
        let results = []

        if (typeof extensionMask === 'string')
            extensionMask = [extensionMask]

        function processDirectory(dir){

            let items = fs.readdirSync(dir)

            for (let item of items){
                const itemFullPath = path.join(dir, item),
                    stat = fs.lstatSync(itemFullPath)

                if (stat.isDirectory())
                    processDirectory(itemFullPath)
                else if(stat.isFile()){
                    if (extensionMask.length && !extensionMask.includes(path.extname(item)))
                        continue

                    results.push(fullPath ? itemFullPath : item)
                }
            }
        }

        processDirectory(dir)
        return results
    },


    /**
     * Gets files in a folder as an array, ready for common.js require
     */
    async getFilesAsModulePaths(directory){
        const modules = [],
            items = await this.readFilesUnderDir(directory, true, ['.js'])

        for (let item of items )
            modules.push(this.fullPathWithoutExtension(item))

        return modules
    },


    /**
     * Gets files in a folder as an array, ready for common.js require
     */
    getFilesAsModulePathsSync(directory){
        const modules = []

        for (let item of this.readFilesUnderDirSync(directory, true, ['.js']))
            modules.push(this.fullPathWithoutExtension(item))

        return modules
    }

}
