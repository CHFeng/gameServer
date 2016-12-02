"use strict";

const SERVER_ID = 250;
const NET_PROTOCOL_VER = 0x10;
const MAX_CLIENT_NUM = 100;
const db = require("./db.js");
const randBuf = require("./randBuf/randBuf.js");

randBuf.init();
/** 分機連線狀態的陣列 */
var clientlinkStatus = [];

var netEventList = {
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
    EVENT_DISPATCH_LINK_PRIZE: 10,
};

exports.clientlinkStatus = clientlinkStatus;

/** 
* 與web Interface的相關資料傳遞
*/
exports.webParser = function(sock, data) {
    let i, cmd, dataLen, cmdData;

    cmd = data.readUInt8(0);
    dataLen = data.readUInt16LE(1);
    if (dataLen > 0) {
        cmdData = data.slice(3);
    }

    switch (cmd) {
        case 1: //查詢分機連線狀態
            let writeData = new Buffer(100);
            writeData.fill(0);
            for (i = 0; i < clientlinkStatus.length; i++) {
                if (clientlinkStatus[i].linked == true) {
                    writeData.writeUInt8(1, clientlinkStatus[i].clientId - 1);
                }
            }
            sock.write(writeData);
            break;
        case 2: //更新分機鎖機時間
            sendCmdToClient(255, netEventList.EVENT_LOCK_TIME, cmdData, 6);
            break;
        case 3: //執行分機鎖機功能
            sendCmdToClient(255, netEventList.EVENT_LOCK_STATUS, cmdData, 1);
            break;
    }
}

/**
 * 與分機板之間的通訊處理
 */
exports.gameParser = function(clientIdx, data) {
    let clientId, cmd, dataLen, cmdData;

    clientId = data.readUInt8();
    cmd = data.readUInt8(1);
    dataLen = data.readUInt16LE(2);
    cmdData = data.slice(4);
    
    //測試用
    clientlinkStatus[clientIdx].clientId = clientId;
    clientlinkStatus[clientIdx].linked = true;

    //console.log("Command is %d from Remote port:%d", cmd, sock.remotePort);
    switch (cmd) {
        case netEventList.EVENT_ACCOUNT:
            eventAccount(clientId, cmdData);
            break;
        case netEventList.EVENT_SPIN:
            eventSpin(clientId, cmdData);
            //回傳水池資訊給分機
            sendSpinAck(clientIdx);
            break;
        case netEventList.EVENT_MEMBER:
            eventMember(clientId, cmdData);
            break;
        case netEventList.EVENT_SETUP:
            if (clientIdx >= 0) {
                eventSetup(clientId, cmdData, clientIdx);
            }
            break;
        case netEventList.EVENT_SHIFT:
            eventShift(cmdData);
            break;
        case netEventList.EVENT_REPORT:
            eventReport(cmdData);
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
    let bufVal = {yBuf:[], zBuf:[], jpScore:[]};

    //讀取分機Y水池累積數值
    for (i = 0; i < 5; i++) {
        for (j = 0; j < 4; j++) {
            bufVal.yBuf[i*4 + j] = cmdData.readDoubleLE(dataIdx);
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
    randBuf.clientInfo.credit[clientId - 1] = cmdData.readUInt8(dataIdx);

    //將水池資訊的部分從接收資料中移除,剩餘資料傳遞給DB的部分來處理
    db.writeSpin(clientId, cmdData.slice(0, dataIdx));
}

/**
 * 處理會員事件, read db then write to sock
 */
function eventMember(clientId, cmdData) {
}

/**
 * 處理遊戲設定事件, read db then write to sock
 */
function eventSetup(id, cmdData, clientIdx) {
    clientlinkStatus[clientIdx].linked = true;
    clientlinkStatus[clientIdx].clientId = id;
    randBuf.clientInfo.linkState[id - 1] = true;

    db.readGameSetup(id, cmdData, function(gameSetup, gameVersionId) {
        var writeData = new Buffer(gameSetup.length + 4 + 16);
        var dataIdx = 0;
        gameVersionId = "BA01D_TC01";
        //sendId
        writeData.writeUInt8(SERVER_ID, dataIdx++);
        //command
        writeData.writeUInt8(netEventList.EVENT_SETUP, dataIdx++);
        //command data length
        writeData.writeUInt16(62, dataIdx);
        dataIdx += 2;
        //通訊版本
        writeData.writeUInt8(NET_PROTOCOL_VER, dataIdx++);
        //遊戲版本
        writeData.write(gameVersionId, dataIdx);
        dataIdx += gameVersionId.length;
        //最高權限密碼
        writeData.writeUInt32LE(1234, dataIdx);
        dataIdx += 4;
        //報帳狀態
        writeData.writeUInt8(0, dataIdx++);
        //分機所需的設定頁相關資訊
        for (let i = 0; i < gameSetup.length; i++) {
            let value = parseInt(gameSetup[i]);
            if (value > 0xFF) value = 0;
            writeData.writeUInt8(value, dataIdx++);
        }

        clientlinkStatus[clientIdx].sock.write(writeData);
    })
}

/**
 * 處理交班事件
 */
function eventShift(cmdData) {
}

/**
 * 處理報帳事件
 */
function eventReport(cmdData) {
}

/**
 * 傳送命令給分機, 當id = 255時傳送給所有分機, 否則則為單一台分機的號碼
 */
function sendCmdToClient(id, cmd, cmdData, len) {
    let writeData = new Buffer(4 + len);
    let i, dataIdx = 0;
    //sendId
    writeData.writeUInt8(SERVER_ID, dataIdx++);
    //command
    writeData.writeUInt8(cmd, dataIdx++);
    //command data length
    writeData.writeUInt16(len, dataIdx);
    dataIdx += 2;
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
    } else if (clientlinkStatus[id].linked == true) {
            clientlinkStatus[id].sock.write(writeData);
    }
}

/**
 * 傳送目前水池累積分數,JP檯面分數,分機狀態傳給分機
 */
function sendSpinAck(clientIdx) {
    let wData = new Buffer(210);
    let dataIdx = 0;
    let i, j;

    wData.fill(0, 0, wData.length);

    wData.writeUInt8(randBuf.clientOnLineState, dataIdx++);
    //JP畫面分數
    for (i = 0; i < 3; i++) {
        wData.writeDoubleLE(randBuf.jpScore[i], dataIdx);
        dataIdx += 8;
    }
    //連線獎項累積分數
    for (i = 0; i < 5; i++) {
        for (j = 0; j < 4; j++) {
            wData.writeDoubleLE(randBuf.yBuf[i*5+j], dataIdx);
            dataIdx += 8;
        }
    }
    for (i = 0; i < 3; i++) {
        wData.writeDoubleLE(randBuf.zBuf[i], dataIdx);
        dataIdx += 8;
    }
    //連線獎項序號,更新本機的連線獎項序號
    wData.writeUInt8(randBuf.prizeSerial, dataIdx++);

    sendCmdToClient(clientIdx, netEventList.EVENT_SPIN_ACK, wData, dataIdx);
}