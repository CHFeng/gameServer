/**
* 處理網路封包
* buffer 的操作
* http://fred-zone.blogspot.tw/2012/03/binary-data-nodejs-buffer-class.html
* https://nodejs.org/api/buffer.html
*/
var SERVER_ID = 250;
var NET_PROTOCOL_VER = 0x10;

var db = require("./db.js");
var clientStatus = [];

var netEventList = {
    //帳目相關事件
    EVENT_ACCOUNT: 1,
    //遊戲事件
    EVENT_SPIN: 2,
    //會員事件
    EVENT_MEMBER: 3,
    //設定頁資訊
    EVENT_SETUP: 4,
    //交班
    EVENT_SHIFT: 5,
    //報帳
    EVENT_REPORT: 6,
    //更新鎖機時間
    EVENT_UPDATE_LOCK_TIME: 7,
    //更新鎖機狀態
    EVENT_LOCK_STATUS: 8,
};

exports.clientStatus = clientStatus;

exports.webParser = function(sock, data) {
    var cmd;
    var dataLen;
    var cmdData;

    cmd = data.readUInt8(0);
    dataLen = data.readUInt16LE(1);
    if (dataLen > 0) {
        cmdData = data.slice(3);
    }

    switch (cmd) {
        case 1: //查詢分機連線狀態
            var writeData = new Buffer(100);
            writeData.fill(0);
            for (var i = 0; i < clientStatus.length; i++) {
                if (clientStatus[i].linkState == true) {
                    writeData.writeUInt8(1, clientStatus[i].clientId - 1);
                }
            }
            sock.write(writeData);
            break;
        case 2: //更新分機鎖機時間
            var writeData = new Buffer(4 + 6);
            var dataIdx = 0;
            //sendId
            writeData.writeUInt8(SERVER_ID, dataIdx++);
            //command
            writeData.writeUInt8(netEventList.EVENT_UPDATE_LOCK_TIME, dataIdx++);
            //command data length
            writeData.writeUInt16(6, dataIdx);
            dataIdx += 2;
            //update lock time data
            for (var i = 0; i < 6; i++) {
                writeData.writeUInt8(cmdData[i], dataIdx++);
            }

            sendCmdToClient(writeData);
            break;
        case 3: //執行分機鎖機功能
            var writeData = new Buffer(4 + 1);
            var dataIdx = 0;
            //sendId
            writeData.writeUInt8(SERVER_ID, dataIdx++);
            //command
            writeData.writeUInt8(netEventList.EVENT_LOCK_STATUS, dataIdx++);
            //command data length
            writeData.writeUInt16(1, dataIdx);
            dataIdx += 2;
            //update lock status event
            writeData.writeUInt8(cmdData[0], dataIdx++);

            sendCmdToClient(writeData);
            break;
    }
}

exports.gameParser = function(clientIdx, data) {
    var clientId;
    var cmd;
    var dataLen;
    var cmdData;

    clientId = data.readUInt8();
    cmd = data.readUInt8(1);
    dataLen = data.readUInt16LE(2);
    cmdData = data.slice(4);
    
    clientStatus[clientIdx].clientId = clientId;
    clientStatus[clientIdx].linkState = true;

    //console.log("Command is %d from Remote port:%d", cmd, sock.remotePort);
    switch (cmd) {
        case netEventList.EVENT_ACCOUNT:
            eventAccount(clientId, cmdData);
            break;
        case netEventList.EVENT_SPIN:
            eventSpin(clientId, cmdData);
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

/*
* 處理帳目事件
*/
function eventAccount(clientId, cmdData) {
    db.writeAccount(clientId, cmdData);
}

/*
* 處理SPIN事件
*/
function eventSpin(clientId, cmdData) {
    db.writeSpin(clientId, cmdData);
}

/*
* 處理會員事件, read db then write to sock
*/
function eventMember(clientId, cmdData) {
}

/*
* 處理遊戲設定事件, read db then write to sock
*/
function eventSetup(id, cmdData, clientIdx) {
    clientStatus[clientIdx].linkState = true;
    clientStatus[clientIdx].clientId = id;

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
        for (var i = 0; i < gameSetup.length; i++) {
            var value = parseInt(gameSetup[i]);
            if (value > 0xFF) value = 0;
            writeData.writeUInt8(value, dataIdx++);
        }

        clientStatus[clientIdx].sock.write(writeData);
    })
}

/*
* 處理交班事件
*/
function eventShift(cmdData) {
}

/*
* 處理報帳事件
*/
function eventReport(cmdData) {
}

/*
* 傳送命令給所有分機
*/
function sendCmdToClient(writeData) {
    for (var i = 0; i < clientStatus.length; i++) {
        if (clientStatus[i].linkState == true) {
            clientStatus[i].sock.write(writeData);
        }
    }
}