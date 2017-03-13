/**
 * 將相關資訊寫入資料庫
 */

var mongoose = require('mongoose');
/** use mongoose to connect mongoDB */
mongoose.connect('mongodb://192.168.1.129/GMS');
//mongoose.connect('mongodb://localhost/GMS');

/** account record data struct */
var accountSchema = new mongoose.Schema({
    clientId: Number,
    eventId: Number,
    score: Number,
    date: Date,
    memberId: Number,
}, {
    collection: "AccountDatas"
});

var accountData = mongoose.model('AccountDatas', accountSchema);

/** 定義機台設定結構 */
var MachineSettingSchema = new mongoose.Schema({
    /** 子機編號 */
    MachineCode: {
        type: Number,
        index: {
            unique: true
        }
    },
    /** 遊戲ID */
    GameVersionID: String,
    /** 設定值物件 */
    SettingArgs: {},
    /** 設定值陣列 */
    PureSettings: []
}, {
    collection: "MachineSettings"
});
var MachineSettings = mongoose.model('MachineSettings', MachineSettingSchema);

/** spin data struct */
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
    memberId: Number,
    winInfo: []
}, {
    collection: "SpinDatas"
});
var spinData = mongoose.model('SpinData', SpinDataSchema);

/** link prize data struct */
var linkPrizeDataSchema = new mongoose.Schema({
    /** 獎項類別 */
    type: String,
    /** 押注區間 */
    betIdx: Number,
    /** 哪一台中獎 */
    clientIdx: Number,
    /** 序號 */
    serial: Number,
    /** 獎項分數 */
    score: Number,
    /** 產生此獎項的日期與時間 */
    date: Date,
}, {
    collection: "linkPrizeDatas"
});
var linkPrizeData = mongoose.model("linkPrizeData", linkPrizeDataSchema);

/**票卷資料結構 */
var ticketDataSchema = new mongoose.Schema({
    /**彩票來源 */
    TraceNO: {
        type: String
    },
    /**彩票號碼 */
    TicketNO: {
        type: String
    },
    /**備註 */
    Description: {
        type: String
    },
    /**建立者 */
    Creator: {
        type: String
    },
    /**兌換時間 */
    ExchangeTime: {
        type: Date,
        default: Date.now
    },
    /**兌換數量 */
    TicketAmount: {
        type: Number
    },
    /**彩票金額 */
    TicketValue: {
        type: Number
    },
    /**彩票狀態 0:In,1:Out,9:作廢*/
    TicketState: {
        type: Number
    },
    /**分機號碼 */
    ClientID: {
        type: Number
    }
}, {
    collection: 'TicketRecords'
})
var TicketRecords = mongoose.model('TicketRecords', ticketDataSchema);
/**
 * 將帳目事件的資料寫入DB
 */
exports.writeAccount = function (clientId, receiveData) {
    var dataIdx = 0;
    var newRecord = new accountData();

    newRecord.clientId = clientId;
    newRecord.eventId = receiveData.readUInt8(dataIdx++);
    newRecord.score = receiveData.readDoubleLE(dataIdx);
    dataIdx += 8;
    //JavaScript counts months from 0 to 11. January is 0. December is 11.
    newRecord.date = new Date((2000 + receiveData[dataIdx++]), receiveData[dataIdx++] - 1, receiveData[dataIdx++],
        receiveData[dataIdx++], receiveData[dataIdx++], receiveData[dataIdx++]);

    newRecord.memberId = receiveData.readUInt32LE(dataIdx);
    /*
    console.log("write account record to DB");
    console.log("Client ID:%d", newRecord.clientId);
    console.log("Event ID:%d", newRecord.eventId);
    console.log("Value:%d", newRecord.score);
    console.log(newRecord.date);
    console.log("Member ID:%d", newRecord.memberId);
    */
    newRecord.save(function (err) {
        if (err) {
            console.log("write account record to DB fail");
        }
        /*else {
                   console.log("write account record success");
               }*/
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
/**
 * 根據clientId & gameVerId從DB讀取設定頁資訊
 */
exports.readGameSetup = function (clientId, gameVerId, callback) {
    MachineSettings.find({
        MachineCode: String(clientId),
        GameVersionID: gameVerId
    }, function (err, gameSettingValue) {
        if (err) return console.error(err);
        if (gameSettingValue.length == 1) {
            /*
            for (var index in gameSettingValue[0].SettingArgs) {
                console.log(index + ":" + gameSettingValue[0].SettingArgs[index])
            }
            */
            callback(gameSettingValue[0].PureSettings, gameSettingValue[0].GameVersionID);
        } else {
            console.log("can't find result with clientId:%d gameVerId:%s", clientId, gameVerId);
        }
    });
}

/**
 * 將Spin data寫入DB
 */
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
    newSpinData.memberId = receiveData.readUInt32LE(dataIdx);
    dataIdx += 4;

    for (var i = 0; i < newSpinData.prizeCount; i++) {
        var item = {
            prizeIdx: receiveData.readUInt8(dataIdx++),
            prizeScore: receiveData.readUInt32LE(dataIdx)
        }
        dataIdx += 4;
        newSpinData.winInfo.push(item);
    }

    //console.log(newSpinData);
    newSpinData.save(function (err) {
        if (err) {
            console.log("write spin data to DB fail");
        }
        /*else {
                   console.log("write spin data success");
               }*/
    });
}

/**
 * 將連線獎項資訊寫入DB
 */
exports.writeLinkPrize = function (yPrizeRecord) {
    var newLinkPrizeData = new linkPrizeData();

    if (yPrizeRecord.type < 3) {
        newLinkPrizeData.type = "JackPot" + (yPrizeRecord.type + 1);
    } else {
        newLinkPrizeData.type = "YBuffer" + (yPrizeRecord.type - 2);
    }

    newLinkPrizeData.betIdx = yPrizeRecord.betIdx;
    newLinkPrizeData.clientIdx = yPrizeRecord.clientIdx;
    newLinkPrizeData.serial = yPrizeRecord.serial;
    newLinkPrizeData.score = yPrizeRecord.score;
    newLinkPrizeData.date = new Date();

    //console.log(newLinkPrizeData);

    newLinkPrizeData.save(function (err) {
        if (err) {
            console.log("write link Prize data to DB fail");
        }
    });

    return newLinkPrizeData;
}
/**產生BCDCode */
exports.generateTicketBCD = function (clientId, cashvalue, callback) {
    var traceNO = '99' + (Date.now()).toString() + '365';
    var data = new TicketRecords({
        TicketNO: traceNO,
        TicketState: 1,
        TicketAmount: 1,
        TicketValue: exchangeData.TicketValue,
        TraceNO: 'Client_' + clientId,
        ExchangeTime: new Date(),
        Creator: '分機:' + clientId,
        ClientID: clientId,
        Description: '分機:' + clientId + '退分'
    });
    data.save(function (err, doc) {
        if (err) {
            callback(err, '');
        } else {
            callback(err, traceNO);
        }
    });
}
/**取得彩票金額 */
exports.getTicketCashValue = function (clientId, bcdcode, callback) {
    TicketRecords.findOne({
        ClientID: clientId,
        TicketNO: bcdcode
    }, function (err, doc) {
        if (err) {
            callback(err, -1);
        }
        if (doc) {
            if (doc.TicketState !== 9) {
                doc.TicketState = 9;
                doc.save(function (err) {
                    if (err) {
                        callback(err, -1);
                    }
                    callback(err, doc.TicketValue);
                });
            } else {
                callback(err, -1);
            }
        } else {
            callback(err, -1);
        }
    });
}