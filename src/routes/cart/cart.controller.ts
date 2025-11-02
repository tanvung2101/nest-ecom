import { Body, Controller, Get, Injectable, Param, Post, Put, Query } from "@nestjs/common";
import { CartService } from "./cart.service";
import { ZodSerializerDto } from "nestjs-zod";
import { AddToCartBodyDTO, CartItemDTO, DeleteCartBodyDTO, GetCartItemParamsDTO, GetCartResDTO, UpdateCartItemBodyDTO } from "./cart.dto";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { PaginationQueryDTO } from "src/shared/dtos/request.dto";
import { MessageResDTO } from "src/shared/dtos/response.dto";

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get()
  @ZodSerializerDto(GetCartResDTO)
  getCart(@ActiveUser('userId') userId: number, @Query() query: PaginationQueryDTO) {
    return this.cartService.getCart(userId, query)
  }

  @Post()
  @ZodSerializerDto(CartItemDTO)
  addToCart(@Body() body: AddToCartBodyDTO, @ActiveUser('userId') userId: number) {
    return this.cartService.addToCart(userId, body)
  }

  @Put(':cartItemId')
  @ZodSerializerDto(CartItemDTO)
  updateCartItem(@ActiveUser('userId') userId: number,@Param() param: GetCartItemParamsDTO, @Body() body: UpdateCartItemBodyDTO) {
    return this.cartService.updateCartItem({userId, cartItemId:param.cartItemId, body})
  }

  @Post('delete')
  @ZodSerializerDto(MessageResDTO)
  deleteCart(@Body() body: DeleteCartBodyDTO, @ActiveUser('userId') userId: number) {
    return this.cartService.deleteCart(userId, body)
  }
}

// 443