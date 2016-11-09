var net = require('net');

var HOST = '127.0.0.1';
var PORT = 16889;

var client = new net.Socket();

client.connect(PORT, HOST, function() {
    var writeData = new Buffer(3);
    console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client
    writeData.writeUInt8(1, 0);
    writeData.writeUInt16LE(0, 1); 
    client.write(writeData, function(){
        console.log("write data to socket finish");
    });

});

client.on('error', function(err) {
    console.log(err);
});

// Add a 'data' event handler for the client socket
// data is what the server sent to this socket
client.on('data', function(data) {
    console.log("Data length:%d", data.length);
    for (var i = 0; i < 100; i++) {
        if (data[i] == 1) {
            console.log("Client:%d online", i+1);
        }
    }
    // Close the client socket completely
    client.destroy();
    
});

// Add a 'close' event handler for the client socket
client.on('close', function() {
    console.log('Connection closed');
});
