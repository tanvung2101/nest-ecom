import { Injectable } from "@nestjs/common";
import { PaymentRepo } from "./payment.repo";
import { WebhookPaymentBodyType } from "./payment.model";

@Injectable()
export class PaymentService {
    constructor(private readonly paymentRepo: PaymentRepo, // Inject the producer here
    ) { }

    async receiver(body: WebhookPaymentBodyType) {
        const result = await this.paymentRepo.receiver(body)
        return result
    }
}