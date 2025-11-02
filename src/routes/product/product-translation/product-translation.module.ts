import { Module } from '@nestjs/common'
import { ProductTranslationController } from 'src/routes/product/product-translation/product-translation.controller'
import { ProductTranslationRepo } from './product-translation.repo'
import { ProductTranslationService } from './product-translation.service'

@Module({
  providers: [ProductTranslationRepo, ProductTranslationService],
  controllers: [ProductTranslationController],
})
export class ProductTranslationModule {}