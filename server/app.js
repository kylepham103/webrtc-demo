const express = require('express')
const https = require('https')
const app = express()
const fs = require('fs')

const https_options = {
    key: fs.readFileSync('./ssl/private.key'),
    cert: fs.readFileSync('./ssl/certificate.crt'),
    ca: [fs.readFileSync('./ssl/ca_bundle.crt')],
}

const server = https.createServer(https_options, app)
const cors = require('cors')
app.use(cors())

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    },
})

io.on('connection', socket => {
    socket.on('disconnect', () => {
        socket.broadcast.emit('callEnded')
    })

    socket.on('callUser', data => {
        io.to(data.userToCall).emit('callUser', {
            signal: data.signalData,
            from: data.from,
        })
    })

    socket.on('answerCall', data => {
        io.to(data.to).emit('callAccepted', data.signal)
    })
})

app.get('/', function (req, res) {
    res.writeHead(200);
    res.end("hello world\n");
});

server.listen(8000, () => console.log('Server is running on port 8000'))
