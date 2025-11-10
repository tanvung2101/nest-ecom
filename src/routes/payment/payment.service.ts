import { Injectable } from "@nestjs/common";
import { PaymentRepo } from "./payment.repo";
import { WebhookPaymentBodyType } from "./payment.model";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { SharedWebsocketRepository } from "src/shared/repositories/sheard-websocket.repo";
import { generateRoomUserId } from "src/shared/helpers";

@Injectable()
@WebSocketGateway({ namespace: 'payment' })
export class PaymentService {
    constructor(private readonly paymentRepo: PaymentRepo,
        private readonly sharedWebsocketRepository: SharedWebsocketRepository, // Inject the producer here
    ) { }
    @WebSocketServer()
    server: Server

    async receiver(body: WebhookPaymentBodyType) {
        const userId = await this.paymentRepo.receiver(body)

        this.server.to(generateRoomUserId(userId)).emit('payment', {
            status: 'success'
        })
        // try {
        //     const websockets = await this.sharedWebsocketRepository.findMany(userId)
        //     websockets.forEach((ws) => {
        //         this.server.to(ws.id).emit('payment', {
        //             status: 'success'
        //         })
        //     })
        // } catch (error) {
        //     console.log(error)
        // }
        return {
            message: 'Payment received successfully',
        }
    }
}