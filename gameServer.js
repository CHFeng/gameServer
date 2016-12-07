"use strict";

const HOST = '192.168.1.108';
/** for game connect port */
const GAME_PORT = 16888;
/** for web connect port */
const WEB_PORT = 16889;

const net = require('net');
const gameServer = net.createServer(gameClientHandle);
const webServer = net.createServer(webClientHandle);

const netParser = require('./parser.js');
var clientlinkStatus = require('./parser.js').clientlinkStatus;

const randBuf = require("./randBuf/randBuf.js");

gameServer.listen(GAME_PORT,  function() {
    console.log('gameServer listening on ' + gameServer.address().address +':'+ gameServer.address().port);
});

webServer.listen(WEB_PORT,  function() {
    console.log('webServer listening on ' + webServer.address().address +':'+ webServer.address().port);
});

/**
 * 新增一個物件到clientlinkStatus的陣列中來進行client狀態的追蹤
 */
function addNewClient(sock) {
    let newClient = {};

    newClient.sock = sock;
    newClient.linked = false;
    newClient.clientId = 1;
    clientlinkStatus.push(newClient);
}

/**
 * 尋找要處理通訊的client socket index
 */
function findClitnIdx(sock) {
    for (let i = 0; i < clientlinkStatus.length; i++) {
        if (clientlinkStatus[i].sock == sock) {
            return i;
        }
    }

    return -1;
}

/**
 * 處理分機板之間的Socket event
 */
function gameClientHandle(sock) {
    //add new client to track
    addNewClient(sock);

    sock.on('connect', function(sock) {
        console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    });
    
    sock.on('close', function(data) {
        var clientIdx;
        clientIdx = findClitnIdx(sock);

        //remove client status from array
        if (clientIdx >= 0) {
            console.log("remove client:%d", clientIdx);
            //將機率模組中分機資訊的連線狀態改為false
            randBuf.clientInfo.linkState[clientlinkStatus[clientIdx].clientId - 1] = false;
            clientlinkStatus.splice(clientIdx, 1);
        }
    });
    
    sock.on('data', function(data) {
        netParser.gameParser(findClitnIdx(sock), data);
    });
    
    sock.on("end", function(sock) {
        //console.log("client exit");
    });
    
    sock.on('error', function(err) {
        console.log("ERROR:");
        console.log(err);
    });
}

/**
 * 處理web interface之間的socket event
 */
function webClientHandle(sock) {
    sock.key = sock.remoteAddress +':'+ sock.remotePort;

    sock.on('connection', function(sock) {
        //console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    });
    
    sock.on('close', function(data) {
        //console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
    });
    
    sock.on('data', function(data) {
        netParser.webParser(sock, data);
    });
    
    sock.on("end", function(sock) {
        //console.log("client exit");
    });
    
    sock.on('error', function(err) {
        console.log(err);
    });
}
