import React, { useEffect, useRef, useState } from 'react'
import { Input, Button } from 'antd'
import io from 'socket.io-client'
import Peer from 'simple-peer'

const socket = io('https://dzungpt97.tk:8000')

interface CallerInterface {
    from: string
    signal: string
}

function App() {
    const [me, setMe] = useState<string>()
    const [stream, setStream] = useState<MediaStream>()
    const [isReceivingCall, setIsReceivingCall] = useState<boolean>(false)
    const [caller, setCaller] = useState<CallerInterface>()
    const [callAccepted, setCallAccepted] = useState(false)
    const [callEnded, setCallEnded] = useState(false)

    const idInputRef = useRef<any>()
    const myStreamRef = useRef<any>()
    const guestStreamRef = useRef<any>()
    const connectionRef = useRef<any>()

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setStream(stream)
            myStreamRef.current.srcObject = stream
        })

        socket.on('connect', () => {
            setMe(socket.id)
        })

        socket.on('callUser', (data: CallerInterface) => {
            setIsReceivingCall(true)
            setCaller(data)
        })
    }, [])

    const callUser = () => {
        const idToCall = idInputRef.current.state.value
        if (!idToCall) return

        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
        })
        peer.on('signal', data => {
            socket.emit('callUser', {
                userToCall: idToCall,
                signalData: data,
                from: me,
            })
        })
        peer.on('stream', guestStream => {
            guestStreamRef.current.srcObject = guestStream
        })
        socket.on('callAccepted', signal => {
            setCallAccepted(true)
            peer.signal(signal)
        })

        connectionRef.current = peer
    }

    const answerCall = () => {
        if (!caller) {
            return
        }

        setCallAccepted(true)
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
        })
        peer.on('signal', data => {
            socket.emit('answerCall', { signal: data, to: caller.from })
        })
        peer.on('stream', guestStream => {
            guestStreamRef.current.srcObject = guestStream
        })

        peer.signal(caller.signal)
        connectionRef.current = peer
    }

    const leaveCall = () => {
        setCallEnded(true)
        connectionRef.current.destroy()
    }

    return (
        <div style={{ textAlign: 'center', paddingTop: 50 }}>
            {'Hello, ' + me}

            <div>
                {isReceivingCall && !callAccepted ? (
                    <div className="caller">
                        <h1>{caller ? caller.from : ''} is calling...</h1>
                        <Button type="primary" onClick={() => answerCall()}>
                            Answer
                        </Button>
                    </div>
                ) : (
                    <Input.Group compact style={{ margin: 20 }}>
                        <Input style={{ width: 300 }} ref={idInputRef} placeholder={'ID to Call'} />
                        {callAccepted && !callEnded ? (
                            <Button type="primary" danger onClick={() => leaveCall()}>
                                End Call
                            </Button>
                        ) : (
                            <Button type="primary" onClick={() => callUser()}>
                                Call
                            </Button>
                        )}
                    </Input.Group>
                )}
            </div>

            <div className="video">
                {stream && <video playsInline muted ref={myStreamRef} autoPlay style={{ width: 300 }} />}
            </div>
            <div className="video">
                {callAccepted && !callEnded ? (
                    <video playsInline ref={guestStreamRef} autoPlay style={{ width: 300 }} />
                ) : null}
            </div>
        </div>
    )
}

export default App
