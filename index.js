const log4js = require('log4js');
var logger = log4js.getLogger('default');
logger.level = 'all';
logger.debug('Loaded module: log4js');
logger.debug('Logger has been initialized');
const arg = process.argv.slice(2);
logger.debug(`Received arguments: ${JSON.stringify(arg)}`);
const fs = require('fs');
logger.debug('Loaded module: fs');
const path = require('path');
logger.debug('Loaded module: path');
// const { exec } = require('child_process');
// const { spawn } = require('child_process');
logger.debug('Loaded module: child_process');
// const request = require('request');
logger.debug('Loaded module: request');
// const sqlite3 = require("sqlite3");
logger.debug('Loaded module: sqlite3');
logger.debug(`Process RAM usage: ${formatFileSize(process.memoryUsage().rss)}`);
logger.info('All modules have been loaded. Initialization is complete');

function formatFileSize (bytes, decimals = 2) {
  if (bytes === 0) return '0 byte';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function zeroPadding (num, digit) {
  return ('000000000000000000000000000000000000000000000000000000000' + num).slice(-digit);
}
let maxMemoryUsage = 0;
let maxMemoryUsageCounter_TimerID = setInterval(() => {
  const memoryUsage = process.memoryUsage().rss;
  if (memoryUsage > maxMemoryUsage) {
    maxMemoryUsage = memoryUsage;
  }
}, 1);

function mergeWorkPagedJsonToIntegratedJson () {
  logger.info(`Function 'mergeWorkPagedJsonToIntegratedJson' has been called. Running ...`);
  logger.debug(`Get the structure of the ${path.join(__dirname, 'db/works/paged/')} ...`);
  fs.readdir(`${path.join(__dirname, 'db/works/paged/')}`, function (err, pagedFileNameList) {
    if (err) throw err;
    logger.info(`Found ${pagedFileNameList.length} paged JSON entry file. Continue processing ...`);
    let isLastFileEntryFilled = null;
    logger.debug(`Loading ${path.join(__dirname, 'db/works/paged/', pagedFileNameList.slice(-1)[0])} ...`);
    fs.readFile(`${path.join(__dirname, 'db/works/paged/', pagedFileNameList.slice(-1)[0])}`, 'utf8', function (err, lastFileEntryJsonDataRaw) {
      if (err) throw err;
      let lastFileEntryJsonData = JSON.parse(lastFileEntryJsonDataRaw);
      let pagedFileNameList_willIntegrate = null;
      if (lastFileEntryJsonData.works.length === 20) {
        isLastFileEntryFilled = true;
        logger.debug(`The last file entry is filled`);
        pagedFileNameList_willIntegrate = pagedFileNameList;
      } else {
        isLastFileEntryFilled = false;
        // pagedFileNameList_willIntegrate = pagedFileNameList.splice(-1);
        pagedFileNameList_willIntegrate = pagedFileNameList;
      }
      let integratedArray = new Array();
      let promises = new Array();
      logger.debug(`Loading all paged JSON entry file ...`);
      pagedFileNameList_willIntegrate.forEach(item => {
        promises.push(
          new Promise ((resolve) => {
            fs.readFile(`${path.join(__dirname, 'db/works/paged/', item)}`, 'utf8', function (err, pagedFileJsonDataRaw) {
              if (err) throw err;
              let pagedFileJsonData = JSON.parse(pagedFileJsonDataRaw);
              pagedFileJsonData.works.forEach(item2 => {
                integratedArray.push(item2);
              });
              resolve();
            });
          })
        );
      });
      Promise.all(promises)
        .then(() => {
          logger.info(`${integratedArray.length} paged JSON entries were integrated`);
          fs.writeFile(`${path.join(__dirname, 'db/works/', 'integrated.json')}`, JSON.stringify(integratedArray), {flag: 'w'}, (err) => {
            if (err) throw err;
            logger.info(`Integrated JSON was written to ${path.join(__dirname, 'db/works/paged/', 'integrated.json')}`);
            logger.info(`Everything is OK`);
            clearInterval(maxMemoryUsageCounter_TimerID);
            logger.debug(`Max Process RAM usage: ${formatFileSize(maxMemoryUsage, 2)}`);
          });
        });
    });
  });
}

// ========== Argument processing ==========

if (arg.length === 0) {
} else {
  if (arg[0] === 'mergeWorkPagedJsonToIntegratedJson') {
    mergeWorkPagedJsonToIntegratedJson();
  }
}