import { Module } from '@nestjs/common'
import { BrandTranslationRepo } from 'src/routes/brand/brand-translation/brand-translation.repo'
import { BrandTranslationService } from 'src/routes/brand/brand-translation/brand-translation.service'
import { BrandTranslationController } from './brand-translation.controller'

@Module({
  providers: [BrandTranslationRepo, BrandTranslationService],
  controllers: [BrandTranslationController],
})
export class BrandTranslationModule {}