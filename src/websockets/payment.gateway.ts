import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'


@WebSocketGateway({ namespace: 'payment' })
export class PaymentGateway {
    @WebSocketServer()
    server: Server

    @SubscribeMessage('send-money')
    handleEvent(@MessageBody() data: string):string {
        this.server.emit('receive-moeny', {
            data: `Hello ${data}`
        })
        return data
    }
}