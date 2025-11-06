import { Injectable } from "@nestjs/common";
import { OrderRepo } from "./order.repo";
import { CreateOrderBodyType, GetOrderListQueryType } from "./order.model";
import { OrderProducer } from "./order.producer";

@Injectable()
export class OrderService {
    constructor(private readonly orderRepo: OrderRepo, private orderProducer: OrderProducer) { }

    async list(userId: number, query: GetOrderListQueryType) {
        return this.orderRepo.list(userId, query)
    }

    async create(userId: number, body: CreateOrderBodyType) {
        const result = await this.orderRepo.create(userId, body)
        return result
    }

    cancel(userId: number, orderId: number) {
        return this.orderRepo.cancel(userId, orderId)
    }

    detail(userId: number, orderId: number) {
        return this.orderRepo.detail(userId, orderId)
    }
}