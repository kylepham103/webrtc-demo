import React, { useEffect, useRef, useState } from 'react'
import { Input, Button } from 'antd'
import io from 'socket.io-client'
import Peer from 'simple-peer'

const socket = io('https://dzungpt97.tk:8000')

interface CallerInterface {
    signal: any
    from: string
    to: string
}

function App() {
    const [me, setMe] = useState<string>()
    const [stream, setStream] = useState<MediaStream>()
    const [isReceivingCall, setIsReceivingCall] = useState<boolean>(false)
    const [caller, setCaller] = useState<CallerInterface>()
    const [isCalling, setIsCalling] = useState(false)

    const idInputRef = useRef<any>()
    const myStreamRef = useRef<any>()
    const guestStreamRef = useRef<any>()

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setStream(stream)
            myStreamRef.current.srcObject = stream
        })

        socket.on('connect', () => {
            setMe(socket.id)
        })

        socket.on('serverCallUser', (data: CallerInterface) => {
            setIsCalling(false)
            setIsReceivingCall(true)
            setCaller(data)
        })

        socket.on('serverLeaveCall', () => {
            leaveCall()
        })
    }, [])

    const clientCallUser = () => {
        const idToCall = idInputRef.current.state.value
        if (!idToCall || !me || idToCall === me) return

        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
        })
        peer.on('signal', data => {
            const dataToCall: CallerInterface = {
                signal: data,
                from: me,
                to: idToCall,
            }
            socket.emit('clientCallUser', dataToCall)
            setCaller(dataToCall)
        })
        peer.on('stream', guestStream => {
            guestStreamRef.current.srcObject = guestStream
        })
        socket.on('serverAnswerCall', signal => {
            answerCall()
            peer.signal(signal)
        })
    }

    const answerCall = () => {
        setIsCalling(true)
        setIsReceivingCall(false)
    }

    const clientAnswerCall = () => {
        if (!caller) return

        answerCall()
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
        })
        peer.on('signal', data => {
            socket.emit('clientAnswerCall', { signal: data, from: me, to: caller.from })
        })
        peer.on('stream', guestStream => {
            guestStreamRef.current.srcObject = guestStream
        })

        peer.signal(caller.signal)
    }

    const leaveCall = () => {
        setIsCalling(false)
        setIsReceivingCall(false)
        setCaller(undefined)
        socket.off('serverAnswerCall')
    }

    const clientLeaveCall = () => {
        leaveCall()
        if (!caller) return
        socket.emit('clientLeaveCall', { caller })
    }

    return (
        <div style={{ textAlign: 'center', paddingTop: 50 }}>
            {me && 'Hello, ' + me}

            <div>
                {isReceivingCall && !isCalling ? (
                    <div className="caller">
                        <h1>{caller ? caller.from : ''} is calling...</h1>
                        <Button type="primary" onClick={() => clientAnswerCall()}>
                            Answer
                        </Button>
                    </div>
                ) : (
                    <Input.Group compact style={{ margin: 20 }}>
                        <Input
                            style={{ width: 300 }}
                            ref={idInputRef}
                            placeholder={'ID to Call'}
                            disabled={isCalling}
                        />
                        {isCalling ? (
                            <Button type="primary" danger onClick={() => clientLeaveCall()}>
                                End Call
                            </Button>
                        ) : (
                            <Button type="primary" onClick={() => clientCallUser()}>
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
                {isCalling ? <video playsInline ref={guestStreamRef} autoPlay style={{ width: 300 }} /> : null}
            </div>
        </div>
    )
}

export default App
