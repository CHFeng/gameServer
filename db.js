/*
* 將相關資訊寫入資料庫
*/

var mongoose = require('mongoose');
//use mongoose to connect mongoDB
//mongoose.connect('mongodb://192.168.1.129/GMS');
mongoose.connect('mongodb://localhost/GMS');

//account record data struct
var accountSchema = new mongoose.Schema({
    clientId: Number,
    eventId: Number,
    score: String,
    date: Date,
}, {
    collection: "AccountDatas"
});

var accountData = mongoose.model('AccountDatas', accountSchema);

// 定義機台設定結構
var MachineSettingSchema = new mongoose.Schema({
    // 子機編號
    MachineCode: {
        type: String,
        index: {
            unique: true
        }
    },
    // 遊戲ID
    GameVersionID: String,
    // 設定值物件
    SettingArgs: [],
    // 設定值陣列
    PureSettings: []
}, {
        collection: "MachineSettings"
    });
var MachineSettings = mongoose.model('MachineSettings', MachineSettingSchema);

//spin data struct
var SpinDataSchema = new mongoose.Schema({
    clientId: Number,
    credit: Number,
    bet: Number,
    win: Number,
    betRate: Number,
    gameMode: Number,
    date: Date,
    gameVersionId: String,
    prizeCount: Number,
    winInfo: []
}, {
    collection: "SpinDatas"
});
var spinData = mongoose.model('SpinData', SpinDataSchema);

exports.writeAccount = function (clientId, receiveData) {
    var dataIdx = 0;
    var newRecord = new accountData();

    newRecord.clientId = clientId;
    newRecord.eventId = receiveData.readUInt8(dataIdx++);
    newRecord.score = receiveData.readUInt32LE(dataIdx);
    dataIdx += 4;
    //JavaScript counts months from 0 to 11. January is 0. December is 11.
    newRecord.date = new Date((2000 + receiveData[dataIdx++]), receiveData[dataIdx++] - 1, receiveData[dataIdx++],
        receiveData[dataIdx++], receiveData[dataIdx++], receiveData[dataIdx++]);

    console.log("write account record to DB");
    console.log("Client ID:%d", newRecord.clientId);
    console.log("Event ID:%d", newRecord.eventId);
    console.log("Value:%d", newRecord.score);
    console.log(newRecord.date);

    newRecord.save(function (err) {
        if (err) {
            console.log("write account record to DB fail");
        } else {
            console.log("write account record success");
        }
    });
}

/* 
目前設定數值缺少以下項目
    "idxPrinterOut",                                       //印表機
    "idxTicketOut",                                        //彩票退票
    "idxCTNPrinterOut",                                    //印表機錶設定
    "idxSubgameAuto",                                      //副遊戲進行=>例:魔豆躲火爐是要手動選擇還是自動選擇
    "idxGambleRate",                                       //比倍遊戲機率
    "idxLanguage",                                         //語言
*/
exports.readGameSetup = function (clientId, gameVerId, callback) {
    MachineSettings.find({ MachineCode: String(clientId)/*, GameVersionID: gameVerId*/ }, function (err, gameSettingValue) {
        if (err) return console.error(err);
        if (gameSettingValue.length == 1) {
            gameSettingValue[0].SettingArgs.forEach(function (value, index, ar) {
                console.log(ar[index].name + ":" + ar[index].value);
            })

            callback(gameSettingValue[0].PureSettings, gameSettingValue[0].GameVersionID);
        } else {
            console.log("result:%d", gameSettingValue.length);
        }
    });
}

exports.writeSpin = function (clientId, receiveData) {
    var dataIdx = 0;
    var newSpinData = new spinData();

    newSpinData.clientId = clientId;
    newSpinData.credit = receiveData.readUInt32LE(dataIdx);
    dataIdx += 4;
    newSpinData.bet = receiveData.readUInt32LE(dataIdx);
    dataIdx += 4;
    newSpinData.win = receiveData.readUInt32LE(dataIdx);
    dataIdx += 4;
    newSpinData.betRate = receiveData.readUInt8(dataIdx++);
    newSpinData.gameMode = receiveData.readUInt8(dataIdx++);
    newSpinData.date = new Date((2000 + receiveData[dataIdx++]), receiveData[dataIdx++] - 1, receiveData[dataIdx++],
        receiveData[dataIdx++], receiveData[dataIdx++], receiveData[dataIdx++]);
    newSpinData.gameVersionId = receiveData.slice(dataIdx, dataIdx + 10);
    dataIdx += 10;
    newSpinData.prizeCount = receiveData.readUInt8(dataIdx++);

    for (var i = 0; i < newSpinData.prizeCount; i++) {
        var item = {
            prizeIdx: receiveData.readUInt8(dataIdx++),
            prizeScore: receiveData.readUInt32LE(dataIdx)
        }
        dataIdx += 4;
        newSpinData.winInfo.push(item);
    }

    console.log(newSpinData);
    newSpinData.save(function (err) {
        if (err) {
            console.log("write spin data to DB fail");
        } else {
            console.log("write spin data success");
        }
    });
}
