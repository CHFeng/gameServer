
var HOST = '192.168.1.108';
/* for game connect port */
var GAME_PORT = 16888;
/* for web connect port */
var WEB_PORT = 16889;

var net = require('net');
var gameServer = net.createServer(gameClientHandle);
var webServer = net.createServer(webClientHandle);

var netParser = require('./parser.js');
var clientStatus = require('./parser.js').clientStatus;

gameServer.listen(GAME_PORT,  function() {
    console.log('gameServer listening on ' + gameServer.address().address +':'+ gameServer.address().port);
});

/*
* 新增一個物件到clientStatus的陣列中來進行client狀態的追蹤
*/
function addNewClient(sock) {
    clientStatus[sock.key] = {};
    clientStatus[sock.key].socket = sock;
    clientStatus[sock.key].linkState = false;
    clientStatus[sock.key].clientId = 0;
}

function gameClientHandle(sock) {
    sock.key = sock.remoteAddress +':'+ sock.remotePort;
    //add new client to track
    addNewClient(sock);
    console.log("key is %s", sock.key);

    sock.on('connect', function(sock) {
        console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    });
    
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
        delete clientStatus[sock.key];
    });
    
    sock.on('data', function(data) {
        netParser.gameParser(sock, data);
    });
    
    sock.on("end", function(sock) {
        console.log("client exit");
    });
    
    sock.on('error', function(err) {
        console.log("ERROR:");
        console.log(err);
    });
}

function webClientHandle(sock) {
    sock.on('connection', function(sock) {
        console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    });
    
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
    });
    
    sock.on('data', function(data) {
        netParser.webParser(sock, data);
    });
    
    sock.on("end", function(sock) {
        console.log("client exit");
    });
    
    sock.on('error', function(err) {
        console.log(err);
    });
}
