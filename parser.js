"use strict";
const SERVER_ID = 250;
const NET_PROTOCOL_VER = 0x10;
const MAX_CLIENT_NUM = 100;
const db = require("./db.js");
const randBuf = require("./randBuf/randBuf.js");
const fs = require("fs");
const crc32 = require("crc-32");
const path = require("path");
/** 水池相關資訊保留檔案的路徑 */
const reserveDataPath =path.join(__dirname,"randBuf/randBufVal");
/** 週期性檢查連線獎項與將水池資訊寫入檔案的時間ms */
const CHECK_PERIOD = 1000;
/** 與分機通訊的資料Header長度 */
const GAME_HEADER_LEN = 8;
/** 與web通訊的資料Hedaer長度 */
const WEB_HEADER_LEN = 3;
/** 與分機通訊的命令事件列表 */
const gameEventList = {
    /** 帳目相關事件 */
    EVENT_ACCOUNT: 1,
    /** 遊戲事件 */
    EVENT_SPIN: 2,
    /** 會員事件 */
    EVENT_MEMBER: 3,
    /** 設定頁資訊 */
    EVENT_SETUP: 4,
    /** 交班 */
    EVENT_SHIFT: 5,
    /** 報帳 */
    EVENT_REPORT: 6,
    /** 更新鎖機時間 */
    EVENT_LOCK_TIME: 7,
    /** 更新鎖機狀態 */
    EVENT_LOCK_STATUS: 8,
    /** 更新水池資訊 */
    EVENT_SPIN_ACK: 9,
    /** 派送連線獎項給分機 */
    EVENT_DISPATCH_PRIZE: 10,
    /** 分機回應連線獎項已接收 */
    EVENT_LINK_PRIZE_ACK: 11,
    /** 分機告知主機JP的處理 */
    EVENT_JP_PRIZE_ACK: 12,
    /** 分機向主機索取票券的BCD code */
    EVENT_CASH_2_BCD: 13,
    /** 分機向主機索取票券的金額 */
    EVENT_BCD_2_CASH: 14,
    /** 分機向主機索取點菜內容 */
    EVENT_MENU:15,
    /** 分機像主機發送點菜需求 */
    EVENT_MENU_ORDER:16,
    /** 分機向主機索取活動內容 */
    EVENT_ACTIVITY:17,
    /** 分機向主機索取幸運滾輪結果 */
    EVENT_LUCKY_WHEEL_SPIN:18,
    /** HEARTBEAT */
    EVENT_HEARTBEAT: 19,
};

/** 與Web通訊的命令事件列表 */
const webEventList = {
    /** 查詢分機連線狀態 */
    EVENT_CHECK_LINK: 1,
    /** 更新分機鎖機時間 */
    EVENT_UPDATE_LOCK_TIME: 2,
    /** 改變分機鎖機狀態 */
    EVENT_UPDATE_LOCK_STATUS: 3,
    /** 更新分機設定頁資訊 */
    EVENT_UPDATE_SETUP: 4,
    /** 更新機率水池資訊 */
    EVENT_UPDATE_BUF_SETTING: 5,
    /** 更新群組檢核碼 */
    EVENT_UPDATE_ROOTPWD: 6,
    /** 查詢機率水池資訊 */
    EVENT_CHECK_BUF_VALUE: 7,
    /** 取得現金票券的BCD碼 */
    EVENT_GET_BCD_VALUE: 8,
    /** 取得票券BCD碼所代表的金額 */
    EVENT_CHECK_BCD_VALUE: 9
};

/** 連線獎項是否已送出 */
var prizeSendStatus = {
    yPrize: 0,
    jpPrize: 0
};

/** 分機連線狀態的陣列 */
var clientlinkStatus = [];

/** WEB socket */
var webSocket;

/** 群組檢核碼 */
var rootPwd = 1234;
/** 系統報帳狀態 */
var payLock = 0;
/** 讀取系統的群組檢核碼與報帳狀態 */
(function () {
    //讀取檢核碼
    if (fs.existsSync("./rootPwd") == false) {
        let fileBuf = new Buffer(4);
        fileBuf.writeUInt32LE(rootPwd);
        fs.writeFileSync("./rootPwd", fileBuf);
    } else {
        let fileContent;
        fileContent = fs.readFileSync("./rootPwd");
        rootPwd = fileContent.readUInt32LE();
    }
    //讀取報帳狀態
    if (fs.existsSync("./payLock") == false) {
        let fileBuf = new Buffer(1);
        fileBuf.writeUInt8(payLock);
        fs.writeFileSync("./payLock", fileBuf);
    } else {
        let fileContent;
        fileContent = fs.readFileSync("./payLock");
        payLock = fileContent.readUInt8();
    }
})();

/** 週期性檢查是否有連線獎項產生 */
function periodCheckRandBuf() {
    randBuf.checkBuf();

    //檢查是否有Y連線獎項需要派送
    if (randBuf.yPrizeRecord.flag == true && prizeSendStatus.yPrize == false) {
        let wData = new Buffer(17);
        let dataIdx = 0;
        wData.writeUInt8(randBuf.yPrizeRecord.flag, dataIdx++);
        wData.writeUInt8(randBuf.yPrizeRecord.type, dataIdx++);
        wData.writeUInt8(randBuf.yPrizeRecord.betIdx, dataIdx++);
        wData.writeUInt8(randBuf.yPrizeRecord.clientIdx, dataIdx++);
        wData.writeUInt8(randBuf.yPrizeRecord.serial, dataIdx++);
        wData.writeDoubleLE(randBuf.yPrizeRecord.score, dataIdx);
        dataIdx += 8;
        wData.writeUInt32LE(randBuf.yPrizeRecord.timeCount, dataIdx);
        dataIdx += 4;
        sendCmdToClient(randBuf.yPrizeRecord.clientIdx, gameEventList.EVENT_DISPATCH_PRIZE, wData, dataIdx);

        prizeSendStatus.yPrize = true;
    } else if (randBuf.yPrizeRecord.flag == false) {
        prizeSendStatus.yPrize = false;
    }

    //檢查是否有JP連線獎項需要派送
    if (randBuf.jpPrizeRecord.flag == true && prizeSendStatus.jpPrize == false) {
        let wData = new Buffer(17);
        let dataIdx = 0;
        wData.writeUInt8(randBuf.jpPrizeRecord.flag, dataIdx++);
        wData.writeUInt8(randBuf.jpPrizeRecord.type, dataIdx++);
        wData.writeUInt8(randBuf.jpPrizeRecord.betIdx, dataIdx++);
        wData.writeUInt8(randBuf.jpPrizeRecord.clientIdx, dataIdx++);
        wData.writeUInt8(randBuf.jpPrizeRecord.serial, dataIdx++);
        wData.writeDoubleLE(randBuf.jpPrizeRecord.score, dataIdx);
        dataIdx += 8;
        wData.writeUInt32LE(randBuf.jpPrizeRecord.timeCount, dataIdx);
        dataIdx += 4;
        sendCmdToClient(randBuf.jpPrizeRecord.clientIdx, gameEventList.EVENT_DISPATCH_PRIZE, wData, dataIdx);

        prizeSendStatus.jpPrize = true;
    } else if (randBuf.jpPrizeRecord.flag == false) {
        prizeSendStatus.jpPrize = false;
    }

    setTimeout(periodCheckRandBuf, CHECK_PERIOD);
}

/** 機率水池初始化 */
randBuf.init(periodCheckRandBuf);

exports.clientlinkStatus = clientlinkStatus;

/**
 * 與web Interface的相關資料傳遞
 */
exports.webParser = function (sock, data) {
    let i, cmd, dataLen, cmdData;

    webSocket = sock;
    if (data.length < WEB_HEADER_LEN) return;

    cmd = data.readUInt8(0);
    dataLen = data.readUInt16LE(1);
    if (dataLen > 0) {
        cmdData = data.slice(WEB_HEADER_LEN);
    }

    switch (cmd) {
        case webEventList.EVENT_CHECK_LINK: //查詢分機連線狀態
            let writeData = new Buffer(100);
            writeData.fill(0);
            for (i = 0; i < clientlinkStatus.length; i++) {
                if (clientlinkStatus[i].linked == true) {
                    writeData.writeUInt8(1, clientlinkStatus[i].clientId - 1);
                }
            }
            sock.write(writeData);
            break;
        case webEventList.EVENT_UPDATE_LOCK_TIME: //更新分機鎖機時間
            if (cmdData.length == 6) {
                let fileContent = new Buffer(1);
                payLock = 1;
                fileContent.writeInt8(payLock);
                fs.writeFileSync("./payLock", fileContent);
                sendCmdToClient(255, gameEventList.EVENT_LOCK_TIME, cmdData, 6);
            }
            break;
        case webEventList.EVENT_UPDATE_LOCK_STATUS: //執行分機鎖機功能
            if (cmdData.length == 1) {
                sendCmdToClient(255, gameEventList.EVENT_LOCK_STATUS, cmdData, 1);
            }
            break;
        case webEventList.EVENT_UPDATE_SETUP: //執行分機更新設定頁
            if (cmdData.length == 11) {
                for (i = 0; i < clientlinkStatus.length; i++) {
                    if (clientlinkStatus[i].clientId === cmdData.readUInt8()) {
                        eventSetup(cmdData.readUInt8(), cmdData.slice(1), i);
                    }
                }
            }
            break;
        case webEventList.EVENT_UPDATE_BUF_SETTING: //設定水池相關設定
            if (cmdData.length == 52) {
                webUpdateBufSetting(cmdData);
            }
            break;
        case webEventList.EVENT_UPDATE_ROOTPWD: //更新群組檢核碼
            if (cmdData.length == 4) {
                rootPwd = cmdData.readUInt32LE();
                fs.writeFileSync("./rootPwd", cmdData);
            }
            break;
        case webEventList.EVENT_CHECK_BUF_VALUE: //檢查機率水池資訊
            let fileContent;
            fileContent = fs.readFileSync(reserveDataPath);
            sock.write(fileContent);
            break;
        case webEventList.EVENT_GET_BCD_VALUE: //分機索取現金票券的BCD code
            if (cmdData.length == 19) {
                let clientId = cmdData.readUInt8();
                let bcdData = new Buffer(18);
                cmdData.copy(bcdData, 0, 1, cmdData.length);

                sendCmdToClient(clientId, gameEventList.EVENT_CASH_2_BCD, bcdData, bcdData.length);
            }
            break;
        case webEventList.EVENT_CHECK_BCD_VALUE: //分機索取BCD code所代表的現金金額
            if (cmdData.length == 9) {
                let clientId = cmdData.readUInt8();
                let cashValue = new Buffer(8);
                cmdData.copy(cashValue, 0, 1, cmdData.length);

                sendCmdToClient(clientId, gameEventList.EVENT_BCD_2_CASH, cashValue, cashValue.length);
            }
            break;
    }
}

/**
 * 根據WEB界面傳來的資料設定水池參數(最大押注,jpMax,jpBase)
 */
function webUpdateBufSetting(cmdData) {
    let i;
    //判斷最大押注是否改變
    if (randBuf.bufValue.MaxBet != cmdData.readUInt32LE()) {
        console.log("change MaxBet to:" + cmdData.readUInt32LE());
        randBuf.bufValue.MaxBet = cmdData.readUInt32LE();
        randBuf.Rand_setMaxBet(randBuf.bufValue.MaxBet);

        //因為最大押注已經改變，重新設定連線獎項的門檻
        for (i = 0; i < 20; i++) {
            randBuf.bufValue.yBufThreshold[i] = 0;
        }
        randBuf.Rand_initBufSetting(randBuf.bufValue);
    }

    //判斷JPMax是否改變
    for (i = 0; i < 3; i++) {
        if (randBuf.bufValue.jpMax[i] != cmdData.readDoubleLE(4 + i * 8)) {
            randBuf.bufValue.jpMax[i] = cmdData.readDoubleLE(4 + i * 8);
            randBuf.Rand_setJPMaxScore(i, randBuf.bufValue.jpMax[i]);
            console.log("change JP%d MaxScore:%f", i + 1, randBuf.bufValue.jpMax[i]);
        }
    }

    //判斷JpBase是否改變
    for (i = 0; i < 3; i++) {
        if (randBuf.bufValue.jpBase[i] != cmdData.readDoubleLE(28 + i * 8)) {
            randBuf.bufValue.jpBase[i] = cmdData.readDoubleLE(28 + i * 8);
            randBuf.Rand_setJPBaseScore(i, randBuf.bufValue.jpBase[i]);
            console.log("change JP%d BaseScore:%f", i + 1, randBuf.bufValue.jpBase[i]);
        }
    }
    //將數值寫入檔案
    randBuf.checkBuf();
}

/**
 * 與分機板之間的通訊處理
 */
exports.gameParser = function (clientIdx, data) {
    let clientId, cmd, dataLen, cmdData, checksum, calChecksum;

    if (data.length < GAME_HEADER_LEN) return;

    clientId = data.readUInt8();
    cmd = data.readUInt8(1);
    dataLen = data.readUInt16LE(2);
    checksum = data.readUInt32LE(4);
    cmdData = data.slice(GAME_HEADER_LEN);
    calChecksum = crc32.buf(cmdData) >>> 0;

    //判斷資料的checksum是否正確
    if (calChecksum != checksum) {
        console.log("checksumError %d %d", calChecksum, checksum);
        return;
    }

    switch (cmd) {
        case gameEventList.EVENT_ACCOUNT:
            if (cmdData.length == 19) {
                eventAccount(clientId, cmdData);
            }
            break;
        case gameEventList.EVENT_SPIN:
            if (cmdData.length >= 260) {
                eventSpin(clientId, cmdData);
                //回傳水池資訊給分機
                sendSpinAck(clientId);
            }
            break;
        case gameEventList.EVENT_MEMBER:
            eventMember(clientId, cmdData);
            break;
        case gameEventList.EVENT_SETUP:
            if (cmdData.length == 10) {
                eventSetup(clientId, cmdData, clientIdx);
            }
            break;
        case gameEventList.EVENT_SHIFT:
            eventShift(cmdData);
            break;
        case gameEventList.EVENT_REPORT:
            eventReport(cmdData);
            break;
        case gameEventList.EVENT_LINK_PRIZE_ACK:
            if (cmdData.length == 1) {
                eventLinkPrizeAck(clientId, cmdData);
            }
            break;
        case gameEventList.EVENT_JP_PRIZE_ACK:
            if (cmdData.length == 10) {
                eventJpPrizeAck(clientId, cmdData);

                let flag = cmdData.readUInt8();
                let type = cmdData.readUInt8(1);
                let score = cmdData.readDoubleLE(2);

                randBuf.Rand_resetJPPrize(type, flag, score);
                //分機已經將JP拉走,將JP分數重新設定為起始數值
                if (flag == true) {
                    //將分機已經開出的JP連線獎項寫入資料庫
                    db.writeLinkPrize(randBuf.jpPrizeRecord);
                    randBuf.Rand_resetJPScore(type);
                }

                prizeSendStatus.jpPrize = false;
            }
            break;
        case gameEventList.EVENT_CASH_2_BCD:
            eventCash2BCDAck(clientId, cmdData);
            break;
        case gameEventList.EVENT_BCD_2_CASH:
            eventBCD2CashAck(clientId, cmdData);
            break;
        case gameEventList.EVENT_MENU:
            eventSendMenuData(clientId, cmdData);
            break;
        case gameEventList.EVENT_MENU_ORDER:
            eventMenuOrder(clientId, cmdData);
            break;
        case gameEventList.EVENT_ACTIVITY:
            eventSendActivityData(clientId, cmdData);
            break;
        case gameEventList.EVENT_LUCKY_WHEEL_SPIN:
            eventLuckyWheelSpin(clientId, cmdData);
            break;
        case gameEventList.EVENT_HEARTBEAT:
            let date = new Date();
            sendCmdToClient(clientId, gameEventList.EVENT_HEARTBEAT, 0, 0);
            break;
    }
}

/**
 * 處理帳目事件
 */
function eventAccount(clientId, cmdData) {
    db.writeAccount(clientId, cmdData);
}

/**
 * 處理SPIN事件
 */
function eventSpin(clientId, cmdData) {
    let i, j, value, dataIdx = 0;
    let bufVal = {
        yBuf: [],
        zBuf: [],
        jpScore: []
    };

    //讀取分機Y水池累積數值
    for (i = 0; i < 5; i++) {
        for (j = 0; j < 4; j++) {
            bufVal.yBuf[i * 4 + j] = cmdData.readDoubleLE(dataIdx);
            dataIdx += 8;
        }
    }

    //讀取分機Z水池累積數值
    for (i = 0; i < 3; i++) {
        bufVal.zBuf[i] = cmdData.readDoubleLE(dataIdx);
        dataIdx += 8;
    }

    //更新到機率連線水池
    randBuf.Rand_serverAddYZBuf(bufVal);

    //讀取分機畫面上JP累積數值
    for (i = 0; i < 3; i++) {
        bufVal.jpScore[i] = cmdData.readDoubleLE(dataIdx);
        dataIdx += 8;
    }

    //更新到機率連線水池
    randBuf.Rand_serverAddJPScore(bufVal.jpScore);
    //console.log(bufVal);

    //讀取分機累積到連線水池的分數
    randBuf.clientInfo.addToLinkBuf[clientId - 1] = cmdData.readDoubleLE(dataIdx);
    dataIdx += 8;
    //讀取分機總營收
    randBuf.clientInfo.totalProfit[clientId - 1] = cmdData.readDoubleLE(dataIdx);
    dataIdx += 8;
    //讀取分機連線獎項佇列的數值
    randBuf.clientInfo.linkPrizeCount[clientId - 1] = cmdData.readUInt8(dataIdx);
    dataIdx += 1;
    //讀取分機的credit(因為credit的數值還會需要存入DB,所以資料不位移)
    randBuf.clientInfo.credit[clientId - 1] = cmdData.readUInt32LE(dataIdx);
    //將分機連線狀態更新為true
    randBuf.clientInfo.linkState[clientId - 1] = true;

    //將水池資訊的部分從接收資料中移除,剩餘資料傳遞給DB的部分來處理
    db.writeSpin(clientId, cmdData.slice(dataIdx, cmdData.length));
}

/**
 * 處理會員事件, read db then write to sock
 */
function eventMember(clientId, cmdData) {}

/**
 * 處理遊戲設定事件, read db then write to sock
 */
function eventSetup(id, cmdData, clientIdx) {
    clientlinkStatus[clientIdx].linked = true;
    clientlinkStatus[clientIdx].clientId = id;

    if (cmdData.length > 10) {
        cmdData = cmdData.slice(0, 10);
    }

    db.readGameSetup(id, cmdData.toString(), function (gameSetup, gameVersionId) {
        let writeData = new Buffer(26 + gameSetup.length);
        let dataIdx = 0;
        let curTime = new Date();

        //通訊版本
        writeData.writeUInt8(NET_PROTOCOL_VER, dataIdx++);
        //遊戲版本
        writeData.write(gameVersionId, dataIdx);
        dataIdx += gameVersionId.length;
        //最高權限密碼
        writeData.writeUInt32LE(rootPwd, dataIdx);
        dataIdx += 4;
        //報帳狀態
        writeData.writeUInt8(payLock, dataIdx++);
        //主機時間
        writeData.writeUInt8(curTime.getFullYear() - 2000, dataIdx++);
        writeData.writeUInt8(curTime.getMonth() + 1, dataIdx++);
        writeData.writeUInt8(curTime.getDate(), dataIdx++);
        writeData.writeUInt8(curTime.getHours(), dataIdx++);
        writeData.writeUInt8(curTime.getMinutes(), dataIdx++);
        writeData.writeUInt8(curTime.getSeconds(), dataIdx++);
        //主機機率的最大押注
        writeData.writeUInt32LE(randBuf.bufValue.MaxBet, dataIdx);
        dataIdx += 4;
        //分機所需的設定頁相關資訊
        for (let i = 0; i < gameSetup.length; i++) {
            let value = parseInt(gameSetup[i]);
            if (value > 0xFF) value = 0;
            writeData.writeUInt8(value, dataIdx++);
        }
        sendCmdToClient(id, gameEventList.EVENT_SETUP, writeData, writeData.length);
    })
}

/**
 * 處理連線獎項的回應事件
 */
function eventLinkPrizeAck(clientId, cmdData) {
    if (randBuf.yPrizeRecord.clientIdx == clientId) {
        //將已送達分機的Y連線獎項寫入資料庫
        db.writeLinkPrize(randBuf.yPrizeRecord);
        randBuf.Rand_resetYPrize(cmdData.readUInt8());
        prizeSendStatus.yPrize = false;
        //console.log("get yBuf link prize ack:" + cmdData.readUInt8());
    } else if (randBuf.jpPrizeRecord.clientIdx == clientId) {
        //告知機率模組JP獎項已送達,但還沒被玩家獲得
        if (cmdData.readUInt8() == 1) {
            randBuf.jpPrizeRecord = randBuf.Rand_updateJpPrize(2);
        } else {
            randBuf.Rand_resetJPPrize(randBuf.jpPrizeRecord.type, 0, 0);
        }
        //console.log("get JP link prize ack:" + cmdData.readUInt8());
    }
}

/**
 * 處理JP獎項的回應事件
 */
function eventJpPrizeAck(clientId, cmdData) {
    if (randBuf.jpPrizeRecord.clientIdx == clientId) {
        let flag = cmdData.readUInt8();
        let type = cmdData.readUInt8(1);
        let score = cmdData.readDoubleLE(2);

        randBuf.Rand_resetJPPrize(type, flag, score);
        //分機已經將JP拉走,將JP分數重新設定為起始數值
        if (flag == true) {
            //將分機已經開出的JP連線獎項寫入資料庫
            db.writeLinkPrize(randBuf.jpPrizeRecord);
            randBuf.Rand_resetJPScore(type);
        }

        prizeSendStatus.jpPrize = false;
    }
}

/**
 * 傳送命令給分機, 當id = 255時傳送給所有分機, 否則則為單一台分機的號碼
 */
function sendCmdToClient(id, cmd, cmdData, len) {
    let writeData = new Buffer(GAME_HEADER_LEN + len);
    let i, dataIdx = 0, checksum;

    writeData.fill(0);
    //sendId
    writeData.writeUInt8(SERVER_ID, dataIdx++);
    //command
    writeData.writeUInt8(cmd, dataIdx++);
    //command data length
    writeData.writeUInt16LE(len, dataIdx);
    dataIdx += 2;
    //data checksum
    checksum = crc32.buf(cmdData) >>> 0;
    writeData.writeUInt32LE(checksum, dataIdx);
    dataIdx += 4;

    //update lock status event
    for (i = 0; i < len; i++) {
        writeData.writeUInt8(cmdData[i], dataIdx++);
    }

    if (id == 255) {
        for (i = 0; i < clientlinkStatus.length; i++) {
            if (clientlinkStatus[i].linked == true) {
                clientlinkStatus[i].sock.write(writeData);
            }
        }
    } else {
        for (i = 0; i < clientlinkStatus.length; i++) {
            if (clientlinkStatus[i].clientId == id && clientlinkStatus[i].linked == true) {
                clientlinkStatus[i].sock.write(writeData);
                break;
            }
        }
    }
}

/**
 * 傳送目前水池累積分數,JP檯面分數,分機狀態傳給分機
 */
function sendSpinAck(clientId) {
    let wData = new Buffer(210);
    let dataIdx = 0;
    let i, j;

    randBuf.checkBuf();

    wData.fill(0);

    wData.writeUInt8(randBuf.clientOnLineState, dataIdx++);
    //JP畫面分數
    for (i = 0; i < 3; i++) {
        wData.writeDoubleLE(randBuf.bufValue.jpScore[i], dataIdx);
        dataIdx += 8;
    }
    //連線獎項累積分數
    for (i = 0; i < 5; i++) {
        for (j = 0; j < 4; j++) {
            wData.writeDoubleLE(randBuf.bufValue.yBuf[i * 4 + j], dataIdx);
            dataIdx += 8;
        }
    }
    for (i = 0; i < 3; i++) {
        wData.writeDoubleLE(randBuf.bufValue.zBuf[i], dataIdx);
        dataIdx += 8;
    }
    //連線獎項序號,更新本機的連線獎項序號
    wData.writeUInt8(randBuf.bufValue.prizeSerial, dataIdx++);

    sendCmdToClient(clientId, gameEventList.EVENT_SPIN_ACK, wData, dataIdx);
}

/**
 * 處理現金轉換成票券的事件
 */
function eventCash2BCDAck(clientId, cmdData) {
    var cashvalue = cmdData.readDoubleLE();
    db.generateTicketBCD(clientId, cashvalue, function (err, bcdcode) {
        if (err) {
            console.log('generate BCDCode fail');
        } else {
            console.log("BCD:%s", bcdcode);
            sendCmdToClient(clientId, gameEventList.EVENT_CASH_2_BCD, bcdcode, bcdcode.length);
        }
    });

}

/**
 * 處理票券轉換成現金的事件
 */
function eventBCD2CashAck(clientId, cmdData) {
    let cashData = new Buffer(8);

    db.getTicketCashValue(clientId, cmdData, function (err, cashValue) {
        if (err) {
            console.log('get ticket cash value fail');
        } else {
            console.log("cashValue:", cashValue);
            cashData.writeDoubleLE(cashValue);
            sendCmdToClient(clientId, gameEventList.EVENT_BCD_2_CASH, cashData, cashData.length);
        }
    });

}

/**
 * 回傳點菜單資訊給分機
 */
function eventSendMenuData(clientId, cmdData) {

}

/**
 * 處理分機點菜事件
 */
function eventMenuOrder(clientId, cmdData) {

}

/**
 * 傳送活動資訊給分機
 */
function eventSendActivityData(clientId, cmdData) {

}

/**
 * 處理分機執行幸運滾輪的spin result
 */
function eventLuckyWheelSpin(clientId, cmdData) {

}