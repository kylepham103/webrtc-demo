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

    socket.on('clientCallUser', data => {
        console.log(data.from  + ' calling to ' + data.to)
        io.to(data.to).emit('serverCallUser', data)
    })

    socket.on('clientAnswerCall', data => {
        console.log(data.from  + ' answer call from ' + data.to)
        io.to(data.to).emit('serverAnswerCall', data.signal)
    })

    socket.on('clientLeaveCall', data => {
        console.log(`Leave call between ${data.caller.from} and ${data.caller.to}`)
        io.to(data.caller.from).emit('serverLeaveCall')
        io.to(data.caller.to).emit('serverLeaveCall')
    })
})

app.get('/', function (req, res) {
    res.writeHead(200);
    res.end("hello world\n");
});

server.listen(8000, () => console.log('Server is running on port 8000'))
