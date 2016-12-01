const randBuf = require('./randBuf.node');
var fs = require("fs");

/** 水池相關資訊的物件 */
var bufValue = {};
/** 用來寫入檔案的buffer物件 */
var fileBuf = new Buffer(469);
/** 水池相關資訊保留檔案的路徑 */
const reserveDataPath = "./randBuf/randBufVal";

/**
 * 將水池相關資訊寫入檔案中保留
 */
function writeBufValToFile() {
    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < 4; j++) {
            fileBuf.writeDoubleLE(bufValue.yBuf[i*4+j], (i*4 + 2*j)*8);
            fileBuf.writeDoubleLE(bufValue.yBufThreshold[i*4+j], 8 + (i*4 + 2*j)*8);
        }
    }

    for (var i = 0; i < 3; i++) {
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
    if (fs.existsSync(reserveDataPath) == false) {
        console.log(reserveDataPath + " is not exit, create a new file");
        bufValue.yBuf = [];
        bufValue.yBufThreshold = [];
        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 4; j++) {
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
        for (var i = 0; i < 3; i++) {
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
        bufVal = fs.readFileSync(reserveDataPath);

        bufValue.yBuf = [];
        bufValue.yBufThreshold = [];
        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 4; j++) {
                bufValue.yBuf[i*4+j] = bufVal.readDoubleLE((i*4 + 2*j) * 8);
                bufValue.yBufThreshold[i*4+j] = bufVal.readDoubleLE(8 + (i*4 + 2*j) * 8);
            }
        }

        bufValue.zBuf = [];
        bufValue.zBufThreshold = [];
        bufValue.jpScore = [];
        bufValue.jpBase = [];
        bufValue.jpMax = [];
        bufValue.jpMaxSet = [];
        for (var i = 0; i < 3; i++) {
            bufValue.zBuf[i] = bufVal.readDoubleLE(320 + (6*i*8));
            bufValue.zBufThreshold[i] = bufVal.readDoubleLE(328 + (6*i*8));
            bufValue.jpScore[i] = bufVal.readDoubleLE(336 + (6*i*8));
            bufValue.jpBase[i] = bufVal.readDoubleLE(344 + (6*i*8));
            bufValue.jpMax[i] = bufVal.readDoubleLE(352 + (6*i*8));
            bufValue.jpMaxSet[i] = bufVal.readDoubleLE(360 + (6*i*8));
        }

        bufValue.MaxBet = bufVal.readUInt32LE(464);
        bufValue.prizeSerial = bufVal.readUInt8(468);
    }
}

/**
 * 此模組的初始化動作
 */
function randBufInit() {
    readBufValFromFile();
    randBuf.Rand_initBufSetting(bufValue);
    writeBufValToFile();
}

/* //test randBuf 
(function() {
    var bufVal = {yBuf:[], zBuf:[]};
    var clientInfo = {
        linkPrizeCount:[],
        credit:[],
        totalProfit:[],
        addToLinkBuf:[]
    }
    for (var i = 0; i < 20; i++) {
        bufVal.yBuf[i] = 0.0;
    }
    bufVal.yBuf[4] = bufValue.yBufThreshold[4];

    for (var i = 0; i < 3; i++) {
        bufVal.zBuf[i] = 0.0;
    }
    bufVal.zBuf[0] = bufValue.zBufThreshold[1];
    bufVal.zBuf[1] = bufVal.zBuf[0];
    bufVal.zBuf[2] = bufVal.zBuf[0] / 0.03 * 0.04;

    randBuf.Rand_serverAddYZBuf(bufVal);

    for (var i = 0; i < 100; i++) {
        clientInfo.linkPrizeCount[i] = 0;
        clientInfo.credit[i] = i*100;
        clientInfo.totalProfit[i] = i*100.0;
        clientInfo.addToLinkBuf[i] = i*100.0;
    }

    var addjpScore = [bufValue.jpMax[0], 0, 0];
    randBuf.Rand_serverAddJPScore(addjpScore);
    randBuf.Rand_updateBufValue(bufValue);
    randBuf.Rand_checkLinkPrize(clientInfo);
    randBuf.Rand_updateBufValue(bufValue);

    var jpPrize = randBuf.Rand_updateJpPrize();
    
    randBuf.Rand_updateBufValue(bufValue);
    
})();
*/
randBuf.init = randBufInit;

module.exports = randBuf;