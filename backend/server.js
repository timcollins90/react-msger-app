const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://timothyjosephcollins.com",
        methods: ["GET", "POST"]
    }
});

const rooms = {}; 

app.get('/api/data', (req, res) => {
    res.json({ message: "Hello from the backend!" });
});

app.post('/api/create-room', (req, res) => {
    const uuid = crypto.randomUUID();
    rooms[uuid] = []; 
    console.log(`Created room: ${uuid}`);
    res.json({ uuid });
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomUuid) => {
        socket.join(roomUuid);
        if (rooms[roomUuid]) {
            socket.emit('history', rooms[roomUuid]);
        }
    });

    socket.on('send_message', (data) => {
        const { room, content, author } = data;
        const messageData = {
            id: Date.now(),
            content: content,
            author: author || "Anonymous", 
            timestamp: new Date().toISOString()
        };

        if (!rooms[room]) rooms[room] = [];
        rooms[room].push(messageData);

        socket.to(room).emit('receive_message', messageData);
    });
});

server.listen(3002, () => {
    console.log('CHAT SERVER RUNNING ON PORT 3002');
});