import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { OrderService } from "./order.service";
import { ZodSerializerDto } from "nestjs-zod";
import { CancelOrderBodyDTO, CancelOrderResDTO, CreateOrderBodyDTO, CreateOrderResDTO, GetOrderDetailResDTO, GetOrderListQueryDTO, GetOrderListResDTO, GetOrderParamsDTO } from "./order.dto";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { GetOrderListQueryType } from "./order.model";

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Get()
    @ZodSerializerDto(GetOrderListResDTO)
    getCart(@ActiveUser('userId') userId: number, @Query() query: GetOrderListQueryDTO) {

        return this.orderService.list(userId, query)
    }

    @Post()
    @ZodSerializerDto(CreateOrderResDTO)
    create(@ActiveUser('userId') userId: number, @Body() body: CreateOrderBodyDTO) {
        return this.orderService.create(userId, body)
    }

    @Get(':orderId')
    @ZodSerializerDto(GetOrderDetailResDTO)
    detail(@ActiveUser('userId') userId: number, @Param() param: GetOrderParamsDTO) {
        return this.orderService.detail(userId, param.orderId)
    }

    @Put(':orderId')
    @ZodSerializerDto(CancelOrderResDTO)
    cancel(@ActiveUser('userId') userId: number, @Param() param: GetOrderParamsDTO, @Body() _: CancelOrderBodyDTO) {
        return this.orderService.cancel(userId, param.orderId)
    }
}