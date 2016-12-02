"use strict";

const randBuf = require('./randBuf.node');
const fs = require("fs");
/** 水池相關資訊保留檔案的路徑 */
const reserveDataPath = "./randBuf/randBufVal";
/** 分機最大數量 */
const MAX_CLIENT_NUM = 100;

/** 水池相關資訊的物件 */
var bufValue = {};
/** 用來寫入檔案的buffer物件 */
var fileBuf = new Buffer(469);

/**
 * 將水池相關資訊寫入檔案中保留
 */
function writeBufValToFile() {
    let i, j;

    for (i = 0; i < 5; i++) {
        for (j = 0; j < 4; j++) {
            fileBuf.writeDoubleLE(bufValue.yBuf[i*4+j], (i*4 + 2*j)*8);
            fileBuf.writeDoubleLE(bufValue.yBufThreshold[i*4+j], 8 + (i*4 + 2*j)*8);
        }
    }

    for (i = 0; i < 3; i++) {
        fileBuf.writeDoubleLE(bufValue.zBuf[i], 320 + (6*i)*8);
        fileBuf.writeDoubleLE(bufValue.zBufThreshold[i], 328 + (6*i)*8);
        fileBuf.writeDoubleLE(bufValue.jpScore[i], 336 + (6*i)*8);
        fileBuf.writeDoubleLE(bufValue.jpBase[i], 344 + (6*i)*8);
        fileBuf.writeDoubleLE(bufValue.jpMax[i], 352 + (6*i)*8);
        fileBuf.writeDoubleLE(bufValue.jpMaxSet[i], 360 + (6*i)*8);
    }

    fileBuf.writeUInt32LE(bufValue.MaxBet, 464);
    fileBuf.writeUInt8(bufValue.prizeSerial, 468);

    fs.writeFileSync(reserveDataPath, fileBuf);
}

/**
 * 將水池相關資訊從檔案中讀取
 */
function readBufValFromFile() {
    let i, j;

    if (fs.existsSync(reserveDataPath) == false) {
        console.log(reserveDataPath + " is not exit, create a new file");
        bufValue.yBuf = [];
        bufValue.yBufThreshold = [];
        for (i = 0; i < 5; i++) {
            for (j = 0; j < 4; j++) {
                bufValue.yBuf[i*4+j] = 0.0;
                bufValue.yBufThreshold[i*4+j] = 0.0;
            }
        }

        bufValue.zBuf = [];
        bufValue.zBufThreshold = [];
        bufValue.jpScore = [];
        bufValue.jpBase = [];
        bufValue.jpMax = [];
        bufValue.jpMaxSet = [];
        for (i = 0; i < 3; i++) {
            bufValue.zBuf[i] = 0.0;
            bufValue.zBufThreshold[i] = 0.0;
            bufValue.jpScore[i] = 0.0;
            bufValue.jpBase[i] = 0.0;
            bufValue.jpMax[i] = 0.0;
            bufValue.jpMaxSet[i] = 0.0;
        }

        bufValue.MaxBet = 500;
        bufValue.prizeSerial = 0;
    } else {
        let fileContent;
        fileContent = fs.readFileSync(reserveDataPath);

        bufValue.yBuf = [];
        bufValue.yBufThreshold = [];
        for (i = 0; i < 5; i++) {
            for (j = 0; j < 4; j++) {
                bufValue.yBuf[i*4+j] = fileContent.readDoubleLE((i*4 + 2*j) * 8);
                bufValue.yBufThreshold[i*4+j] = fileContent.readDoubleLE(8 + (i*4 + 2*j) * 8);
            }
        }

        bufValue.zBuf = [];
        bufValue.zBufThreshold = [];
        bufValue.jpScore = [];
        bufValue.jpBase = [];
        bufValue.jpMax = [];
        bufValue.jpMaxSet = [];
        for (i = 0; i < 3; i++) {
            bufValue.zBuf[i] = fileContent.readDoubleLE(320 + (6*i*8));
            bufValue.zBufThreshold[i] = fileContent.readDoubleLE(328 + (6*i*8));
            bufValue.jpScore[i] = fileContent.readDoubleLE(336 + (6*i*8));
            bufValue.jpBase[i] = fileContent.readDoubleLE(344 + (6*i*8));
            bufValue.jpMax[i] = fileContent.readDoubleLE(352 + (6*i*8));
            bufValue.jpMaxSet[i] = fileContent.readDoubleLE(360 + (6*i*8));
        }

        bufValue.MaxBet = fileContent.readUInt32LE(464);
        bufValue.prizeSerial = fileContent.readUInt8(468);
    }
}

/**
 * 此模組的初始化動作
 */
function randBufInit() {
    let i;

    readBufValFromFile();
    randBuf.Rand_initBufSetting(bufValue);
    writeBufValToFile();

    // 分機連上系統的數量狀態
    randBuf.clientOnLineState = 0;
    
    //初始化分機資訊
    randBuf.clientInfo = {
        linkState:[],
        linkPrizeCount:[],
        credit:[],
        totalProfit:[],
        addToLinkBuf:[]
    };

    for (i = 0; i < MAX_CLIENT_NUM; i++) {
        randBuf.clientInfo.linkState[i] = 0;
        randBuf.clientInfo.linkPrizeCount[i] = 0;
        randBuf.clientInfo.credit[i] = 0;
        randBuf.clientInfo.totalProfit[i] = 0.0;
        randBuf.clientInfo.addToLinkBuf[i] = 0.0;
    }
}

randBuf.init = randBufInit;

module.exports = randBuf;