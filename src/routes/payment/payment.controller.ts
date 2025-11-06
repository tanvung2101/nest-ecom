import { Body, Controller, Post } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { ZodSerializerDto } from "nestjs-zod";
import { MessageResDTO } from "src/shared/dtos/response.dto";
import { Auth, IsPublic } from "src/shared/decorators/auth.decorator";
import { WebhookPaymentBodyDTO } from "./payment.dto";

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/receiver')
  @ZodSerializerDto(MessageResDTO)
  @Auth(['PaymentAPIKey'])
  receiver(@Body() body: WebhookPaymentBodyDTO) {
    return this.paymentService.receiver(body)
  }
}
