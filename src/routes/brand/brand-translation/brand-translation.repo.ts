import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { BrandTranslationType, CreateBrandTranslationBodyType, GetBrandTranslationDetailResType, UpdateBrandTranslationBodyType } from "./brand-translation.model";
import { SerializeAll } from "src/shared/decorators/serialize.decorator";

@Injectable()
@SerializeAll()
export class BrandTranslationRepo{
    constructor(private prismaService: PrismaService){}

    findById(id: number):Promise<GetBrandTranslationDetailResType | null>{
        return this.prismaService.brandTranslation.findUnique({
            where: {
                id, deletedAt: null
            }
        })as any
    }

    create({createdById, data}: {createdById: number, data: CreateBrandTranslationBodyType}):Promise<BrandTranslationType>{
        return this.prismaService.brandTranslation.create({
            data: {
                ...data,
                createdById
            }
        })as any
    }


    async update({id, updatedById, data}: {id: number, updatedById: number, data: UpdateBrandTranslationBodyType}):Promise<BrandTranslationType>{
        return this.prismaService.brandTranslation.update({
            where: {
                id, deletedAt: null
            },
            data: {
                ...data, updatedById
            }
        })as any
    }

    delete(
    {
      id,
      deletedById,
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
  ): Promise<BrandTranslationType> {
    return (isHard
      ? this.prismaService.brandTranslation.delete({
          where: {
            id,
          },
        })
      : this.prismaService.brandTranslation.update({
          where: {
            id,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
            deletedById,
          },
        }))as any
  }


}