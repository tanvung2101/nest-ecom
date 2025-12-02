import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod'
import CustomZodValidationPipe from './shared/pipes/custom-zod-validation.pipe'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'
import { AuthModule } from './routes/auth/auth.module'
import { LanguageModule } from './routes/language/language.module';
import { PermissionModule } from './routes/permission/permission.module'
import { RoleModule } from './routes/role/role.module'
import { MediaModule } from './routes/media/media.module'
import path from 'path'
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { BrandModule } from './routes/brand/brand.module'
import { BrandTranslationModule } from './routes/brand/brand-translation/brand-translation.module'
import { CategoryTranslationModule } from './routes/category/category-translation/category-translation.module'
import { CategoryModule } from './routes/category/category.module'
import { ProductModule } from './routes/product/product.module'
import { ProductTranslationModule } from './routes/product/product-translation/product-translation.module'
import { CartModule } from './routes/cart/cart.module'
import { OrderModule } from './routes/order/order.module'
import { BullModule } from '@nestjs/bullmq';
import { PaymentConsumer } from './queues/payment.consumer'
import { WebsocketModule } from './websockets/websocket.module'
import { ProfileModule } from './routes/profile/profile.module'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerBehindProxyGuard } from './shared/guards/throttler-behind-proxy.guard'

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'redis-10839.c1.ap-southeast-1-1.ec2.redns.redis-cloud.com',
        port: 10839,
        username: 'default',
        password: 'A8ENqUXhfUfWs1ULZEYW5RG7uQb2VGse',
      },
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.resolve('src/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
      typesOutputPath: path.resolve('src/generated/i18n.generated.ts'),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    SharedModule, AuthModule, LanguageModule, PermissionModule, RoleModule, MediaModule, BrandModule, BrandTranslationModule, CategoryTranslationModule, CategoryModule,
    ProductModule, ProductTranslationModule, CartModule, OrderModule, WebsocketModule, ProfileModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard
    },
    PaymentConsumer
  ],
})
export class AppModule { }

// 1216
