const randBuf = require('./build/Release/randBuf.node');
var fs = require("fs");

var bufSetting = {};
var wBuf = new Buffer(469);

/**
 * 將水池相關資訊寫入檔案中保留
 */
function writeBufValToFile() {
    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < 4; j++) {
            wBuf.writeDoubleLE(bufSetting.yBuf[i*4+j], (i*4 + 2*j)*8);
            wBuf.writeDoubleLE(bufSetting.yBufThreshold[i*4+j], 8 + (i*4 + 2*j)*8);
        }
    }

    for (var i = 0; i < 3; i++) {
        wBuf.writeDoubleLE(bufSetting.zBuf[i], 320 + (6*i)*8);
        wBuf.writeDoubleLE(bufSetting.zBufThreshold[i], 328 + (6*i)*8);
        wBuf.writeDoubleLE(bufSetting.jpScore[i], 336 + (6*i)*8);
        wBuf.writeDoubleLE(bufSetting.jpBase[i], 344 + (6*i)*8);
        wBuf.writeDoubleLE(bufSetting.jpMax[i], 352 + (6*i)*8);
        wBuf.writeDoubleLE(bufSetting.jpMaxSet[i], 360 + (6*i)*8);
    }

    wBuf.writeUInt32LE(bufSetting.MaxBet, 464);
    wBuf.writeUInt8(bufSetting.prizeSerial, 468);

    fs.writeFileSync("./randBufVal", wBuf);
}

/**
 * 將水池相關資訊從檔案中讀取
 */
function readBufValFromFile() {
    if (fs.existsSync("./randBufVal") == false) {
        console.log("./randBufVal is not exit, create a new file");
        bufSetting.yBuf = [];
        bufSetting.yBufThreshold = [];
        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 4; j++) {
                bufSetting.yBuf[i*4+j] = 0.0;
                bufSetting.yBufThreshold[i*4+j] = 0.0;
            }
        }

        bufSetting.zBuf = [];
        bufSetting.zBufThreshold = [];
        bufSetting.jpScore = [];
        bufSetting.jpBase = [];
        bufSetting.jpMax = [];
        bufSetting.jpMaxSet = [];
        for (var i = 0; i < 3; i++) {
            bufSetting.zBuf[i] = 0.0;
            bufSetting.zBufThreshold[i] = 0.0;
            bufSetting.jpScore[i] = 0.0;
            bufSetting.jpBase[i] = 0.0;
            bufSetting.jpMax[i] = 0.0;
            bufSetting.jpMaxSet[i] = 0.0;
        }

        //bufSetting.MaxBet = 500;
        bufSetting.prizeSerial = 0;
    } else {
        bufVal = fs.readFileSync("./randBufVal");

        bufSetting.yBuf = [];
        bufSetting.yBufThreshold = [];
        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 4; j++) {
                bufSetting.yBuf[i*4+j] = bufVal.readDoubleLE((i*4 + 2*j) * 8);
                bufSetting.yBufThreshold[i*4+j] = bufVal.readDoubleLE(8 + (i*4 + 2*j) * 8);
            }
        }

        bufSetting.zBuf = [];
        bufSetting.zBufThreshold = [];
        bufSetting.jpScore = [];
        bufSetting.jpBase = [];
        bufSetting.jpMax = [];
        bufSetting.jpMaxSet = [];
        for (var i = 0; i < 3; i++) {
            bufSetting.zBuf[i] = bufVal.readDoubleLE(320 + (6*i*8));
            bufSetting.zBufThreshold[i] = bufVal.readDoubleLE(328 + (6*i*8));
            bufSetting.jpScore[i] = bufVal.readDoubleLE(336 + (6*i*8));
            bufSetting.jpBase[i] = bufVal.readDoubleLE(344 + (6*i*8));
            bufSetting.jpMax[i] = bufVal.readDoubleLE(352 + (6*i*8));
            bufSetting.jpMaxSet[i] = bufVal.readDoubleLE(360 + (6*i*8));
        }

        bufSetting.MaxBet = bufVal.readUInt32LE(464);
        bufSetting.prizeSerial = bufVal.readUInt8(468);
    }
}

readBufValFromFile();

randBuf.Rand_initBufSetting(bufSetting);

writeBufValToFile();

//test randBuf 
(function() {
    var bufVal = {yBuf:[], zBuf:[]};
    var clientInfo = {
        linkPrizeCount:[],
        credit:[],
        totalProfit:[],
        addToLinkBuf:[],
        linkState:[]
    }
    for (var i = 0; i < 20; i++) {
        bufVal.yBuf[i] = 0.0;
    }
    bufVal.yBuf[4] = bufSetting.yBufThreshold[4];

    for (var i = 0; i < 3; i++) {
        bufVal.zBuf[i] = 0.0;
    }
    bufVal.zBuf[0] = bufSetting.zBufThreshold[1];
    bufVal.zBuf[1] = bufVal.zBuf[0];
    bufVal.zBuf[2] = bufVal.zBuf[0] / 0.03 * 0.04;

    randBuf.Rand_serverAddYZBuf(bufVal);

    for (var i = 0; i < 100; i++) {
        clientInfo.linkPrizeCount[i] = 0;
        clientInfo.credit[i] = i*100;
        clientInfo.totalProfit[i] = i*100.0;
        clientInfo.addToLinkBuf[i] = i*100.0;
        clientInfo.linkState[i] = 1;
    }

    var addjpScore = [bufSetting.jpMax[0], 0, 0];
    randBuf.Rand_serverAddJPScore(addjpScore);
    randBuf.Rand_updateBufValue(bufSetting);
    randBuf.Rand_checkLinkPrize(clientInfo);
    randBuf.Rand_updateBufValue(bufSetting);

    var jpPrize = randBuf.Rand_updateJpPrize();
    
    randBuf.Rand_updateBufValue(bufSetting);
    randBuf.Rand_setMaxBet(500)
})();
