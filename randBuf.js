
var fs = require("fs");
var RandBuf = {};

/** 押注區間總數 */
const MAX_BET_LEVEL_COUNT = 5;
/** Y水池分類總數 */
const MAX_Y_BUFFER = 4;
/** Z水池分類總數 JP1 JP2 JP3 */
const MAX_Z_BUFFER = 3;

/**
 * 機率模組水池相關變數的初始化
 */
function RandBuf_Init() {
    var bufVal, offset;
    var wBuf = new Buffer(393);

    RandBuf.yBuf = [];
    RandBuf.yThreshold = [];
    RandBuf.zBuf = [];
    RandBuf.zThreshold = [];
    RandBuf.jpScore = [];
    RandBuf.linkPrizeSerial = 0;

    if (fs.existsSync("./randBufVal.txt") == false) {
        //throw new Error("./randBufVal.txt is not exit");
        console.log("./randBufVal.txt is not exit, create a new file");

        for (var i = 0; i < MAX_BET_LEVEL_COUNT * MAX_Y_BUFFER; i++) {
            RandBuf.yBuf.push(0);
            wBuf.writeDoubleLE(RandBuf.yBuf[i], i*8);
            RandBuf.yThreshold.push(1000);
            wBuf.writeDoubleLE(RandBuf.yThreshold[i], 8 + i*8);
        }

        offset = 2 * MAX_BET_LEVEL_COUNT * MAX_Y_BUFFER * 8;
        for (var i = 0; i < MAX_Z_BUFFER; i++) {
            RandBuf.zBuf.push(0);
            wBuf.writeDoubleLE(RandBuf.zBuf[i], offset + i*8);
            RandBuf.zThreshold.push(1000*(i+1)); 
            wBuf.writeDoubleLE(RandBuf.zThreshold[i], offset + 8 + i*8);
            RandBuf.jpScore.push(1000*(i+1));
            wBuf.writeDoubleLE(RandBuf.jpScore[i], offset + 16 + i*8);
        }

        offset += 3 * MAX_Z_BUFFER * 8;
        wBuf.writeUInt8(RandBuf.linkPrizeSerial, offset);

        fs.writeFileSync("./randBufVal.txt", wBuf);
    }

    bufVal = fs.readFileSync("./randBufVal.txt");

    //從檔案中讀取相關數值
    for (var i = 0; i < MAX_BET_LEVEL_COUNT * MAX_Y_BUFFER; i++) {
        RandBuf.yBuf.push(bufVal.readDoubleLE(i*8));
        RandBuf.yThreshold.push(bufVal.readDoubleLE(8 + i*8)); 
    }

    offset = 2 * MAX_BET_LEVEL_COUNT * MAX_Y_BUFFER * 8;
    for (var i = 0; i < MAX_Z_BUFFER; i++) {
        RandBuf.zBuf.push(bufVal.readDoubleLE(offset + i*8));
        RandBuf.zThreshold.push(bufVal.readDoubleLE(offset + 8 + i*8)); 
        RandBuf.jpScore.push(bufVal.readDoubleLE(offset + 16 + i*8));
    }

    offset += 3 * MAX_Z_BUFFER * 8;
    RandBuf.linkPrizeSerial = bufVal.readUInt8(offset);
}

/**
 * 設定Y水池門檻數值
 */
function RandBuf_SetYThreshold() {

}

RandBuf.init = RandBuf_Init;

module.exports = RandBuf;
