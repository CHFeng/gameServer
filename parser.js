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
    EVENT_REPORT: 6
};
exports.clientStatus = clientStatus;
exports.gameParser = function(sock, data) {
    var clientId;
    var cmd;
    var dataLen;
    var cmdData;

    clientId = data.readUInt8();
    cmd = data.readUInt8(1);
    dataLen = data.readUInt16LE(2);
    cmdData = data.slice(4);
    
    console.log("Command is %d from Remote port:%d", cmd, sock.remotePort);
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
            eventSetup(clientId, cmdData, sock);
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
    console.log("thie command is ACCOUNT from client:%d", clientId);
    console.log("Data is:", cmdData);

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
function eventSetup(id, cmdData, sock) {
    clientStatus[sock.key].linkState = true;
    clientStatus[sock.key].clientId = id;

    db.readGameSetup(id, cmdData, function(gameSetup, gameVersionId) {
        var writeData = new Buffer(gameSetup.length + 3 + 16);
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

        sock.write(writeData);
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
