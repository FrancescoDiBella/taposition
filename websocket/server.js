// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
    origin: "*", // The client URL you want to allow
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
}
});

// Serve the client files
app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chat message', (msg) => {
        console.log('Message received: ' + msg);
        io.emit('chat message', msg); // Broadcast the message to all clients
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});



const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//emit a 'obstacles' event every 2 seconds with a random set of x and y coordinates between -10 and 10
setInterval(() => {
    io.emit('obstacles', {
        x: Math.floor(Math.random() * 20) - 10,
        y: Math.floor(Math.random() * 20) - 10
    });
}, 2000);

//add a webhooks route that then emits an obstacle event
app.post('/webhooks', (req, res) => {
    io.emit('obstacles', {
        x: Math.floor(Math.random() * 20) - 10,
        y: Math.floor(Math.random() * 20) - 10
    });
    res.send('Webhook received');
});
