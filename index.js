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

const CONFIG = {
  "apiBaseUrl": "https://api.asmr-200.com/api"
};

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
        pagedFileNameList_willIntegrate = pagedFileNameList.splice(-1);
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
          fs.writeFile(`${path.join(__dirname, 'db/works/', 'integrated.json')}`, JSON.stringify({
            "works": integratedArray,
            "totalEntry": integratedArray.length,
            "totalPage": pagedFileNameList_willIntegrate.length
          }), {flag: 'w'}, (err) => {
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

/*
    console.log(data.works.map((obj) => obj.id).sort((a, b) => a - b));
*/

function createDBWorkFolder () {
  /*
  こういうフォルダを生成するためのスクリプトです。
  db/work/workInfo/2022/01/01/
  db/work/tracks/2022/01/01/
  */
  fs.readFile(`${path.join(__dirname, 'db/works/', 'integrated.json')}`, 'utf8', function (err, dataRaw) {
    if (err) throw err;
    let data = JSON.parse(dataRaw);
    let createDateArrNotCleaned = data.works.map((obj) => obj.create_date);
    let createDateArr = Array.from(new Set(createDateArrNotCleaned));
    let promises = new Array();
    createDateArr.forEach((obj) => {
      let date = new Date(obj);
      let dateYear = date.getFullYear().toString();
      let dateMonth = zeroPadding(date.getMonth() + 1, 2);
      let dateDate = zeroPadding(date.getDate(), 2);
      promises.push(
        new Promise ((resolve) => {
          fs.mkdir(`${path.join(__dirname, 'db/work/workInfo/', dateYear, dateMonth, dateDate)}`, {recursive: true}, (err) => {
            if (err) throw err;
            fs.mkdir(`${path.join(__dirname, 'db/work/tracks/', dateYear, dateMonth, dateDate)}`, {recursive: true}, (err) => {
              if (err) throw err;
              console.log(path.join(__dirname, 'db/work/workInfo/', dateYear, dateMonth, dateDate));
              resolve();
            });
          });
        })
      );
    });
    Promise.all(promises)
      .then(() => {
        logger.info(`Everything is OK`);
        clearInterval(maxMemoryUsageCounter_TimerID);
        logger.debug(`Max Process RAM usage: ${formatFileSize(maxMemoryUsage, 2)}`);
      });
  });
}

function outputDBWorkInfoJsonDownloadScriptBat (yearStart, yearEnd) {
  fs.readFile(`${path.join(__dirname, 'db/works/', 'integrated.json')}`, 'utf8', function (err, dataRaw) {
    if (err) throw err;
    let data = JSON.parse(dataRaw);
    let filteredData = data.works.filter((obj) => {
      let date = new Date(obj.create_date);
      return date.getFullYear() >= yearStart && date.getFullYear() <= yearEnd;
    });
    let outputBatArray = new Array();
    let outputBatInitializationScript = ``;
    filteredData.forEach((obj) => {
      let date = new Date(obj.create_date);
      let commandSubArray = new Array();
      commandSubArray.push(`${CONFIG.apiBaseUrl}/workInfo/${obj.id}`);
      commandSubArray.push(`  dir=${path.join(__dirname, 'db/work/workInfo/', date.getFullYear().toString(), zeroPadding(date.getMonth() + 1, 2), zeroPadding(date.getDate(), 2))}`);
      commandSubArray.push(`  out=${obj.id}.json`);
      commandSubArray.push(`${CONFIG.apiBaseUrl}/tracks/${obj.id}`);
      commandSubArray.push(`  dir=${path.join(__dirname, 'db/work/tracks/', date.getFullYear().toString(), zeroPadding(date.getMonth() + 1, 2), zeroPadding(date.getDate(), 2))}`);
      commandSubArray.push(`  out=${obj.id}.json`);
      outputBatArray.push(commandSubArray.join('\r\n'));
    });
    fs.writeFile(`${path.join(__dirname, 'DBWorkInfoJsonDownloadAria2c.txt')}`, outputBatArray.join('\r\n'), {flag: 'w'}, (err) => {
      if (err) throw err;
      logger.info(`Execute it ==> aria2c -x16 -s1 -j16 --auto-file-renaming=false --deferred-input --connect-timeout=15 --timeout=15 -i "DBWorkInfoJsonDownloadAria2c.txt"`);
      logger.info(`Everything is OK`);
      clearInterval(maxMemoryUsageCounter_TimerID);
      logger.debug(`Max Process RAM usage: ${formatFileSize(maxMemoryUsage, 2)}`);
    });
  });
}

// ========== Argument processing ==========

if (arg.length === 0) {
  // nothing
} else {
  if (arg[0] === 'mergeWorkPagedJsonToIntegratedJson') {
    mergeWorkPagedJsonToIntegratedJson();
  } else if (arg[0] === 'createDBWorkFolder') {
    createDBWorkFolder();
  } else if (arg[0] === 'outputDBWorkInfoJsonDownloadScriptBat') {
    outputDBWorkInfoJsonDownloadScriptBat(arg[1], arg[2]);
  }
}