import { Injectable } from '@nestjs/common'
import { CreateProductBodyType, GetProductDetailResType, GetProductsResType, ProductType, UpdateProductBodyType } from 'src/routes/product/product.model'
import { ALL_LANGUAGE_CODE, OrderBy, OrderByType, SortBy, SortByType } from 'src/shared/constants/other.constant'
import { PrismaService } from 'src/shared/services/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class ProductRepo {
  constructor(private readonly prismaService: PrismaService) { }

  async list({
    limit,
    page,
    name,
    brandIds,
    categories,
    maxPrice,
    minPrice,
    createdById,
    isPublic,
    languageId,
    orderBy = OrderBy.Desc, 
  sortBy = SortBy.CreatedAt,
  }:{limit:number, 
    page:number, 
    name?:string , 
    brandIds?: number[], 
    categories?: number[], 
    minPrice?: number,
    maxPrice?: number, 
    createdById?: number, 
    isPublic?: boolean, 
    languageId: string,
    orderBy: OrderByType
    sortBy: SortByType
  }): Promise<GetProductsResType> {
    const skip = (page - 1) * limit
    const take = limit

    let where:Prisma.ProductWhereInput = {
      deletedAt:null,
      createdById: createdById? createdById: undefined,
    }
    if(isPublic === true){
      where.publishedAt = {
        lte: new Date(),
        not: null
      }
    }else if(isPublic === false){
      where = {
        ...where,
        OR: [{publishedAt: null}, {publishedAt: {gt: new Date()}}]
      }
    }

    if(name){
      where.name = {
        contains: name,
        mode: 'insensitive'
      }
    }
    if(brandIds && brandIds.length > 0){
      where.brandId = {
        in: brandIds
      }
    }
    if(categories && categories.length > 0){
      where.categories = {
        some: {
          id: {
            in: categories
          }
        }
      }
    }
    if(minPrice !== undefined || maxPrice !== undefined){
      where.basePrice = {
        gte: minPrice,
        lte: maxPrice,
      }
    }
    // Mặc định sort theo createdAt mới nhất
    let caculatedOrderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = {
      createdAt: orderBy,
    }
    if (sortBy === SortBy.Price) {
      caculatedOrderBy = {
        basePrice: orderBy,
      }
    } else if (sortBy === SortBy.Sale) {
      caculatedOrderBy = {
        orders: {
          _count: orderBy,
        },
      }
    }
    const [totalItems, data] = await Promise.all([
      this.prismaService.product.count({
        where
      }),
      this.prismaService.product.findMany({
        where,
        include: {
          productTranslations: {
            where: languageId === ALL_LANGUAGE_CODE ? { deletedAt: null } : { languageId, deletedAt: null },
          },
        },
        orderBy: caculatedOrderBy,
        skip,
        take,
      }),
    ])
    return {
      data,
      totalItems,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalItems / limit),
    }as any
  }

  findById(productId: number): Promise<ProductType | null> {
    return this.prismaService.product.findUnique({
      where: {
        id: productId,
        deletedAt: null,
      },
    })as any
  }

  getDetail({productId, languageId, isPublic}: {productId: number
    languageId: string
    isPublic?: boolean}): Promise<GetProductDetailResType | null> {
      let where:Prisma.ProductWhereUniqueInput = {
        id: productId,
        deletedAt: null
      }
      if(isPublic === true){
        where.publishedAt = {
          lte: new Date(),
          not: null
        }
      }else if(isPublic === false){
        where ={
          ...where,
          OR: [{ publishedAt: null }, { publishedAt: { gt: new Date() } }],
      
        }
      }
    return this.prismaService.product.findUnique({
      where,
      include: {
        productTranslations: {
          where: languageId === ALL_LANGUAGE_CODE ? { deletedAt: null } : { languageId, deletedAt: null },
        },
        skus: {
          where: {
            deletedAt: null,
          },
        },
        brand: {
          include: {
            brandTranslations: {
              where: languageId === ALL_LANGUAGE_CODE ? { deletedAt: null } : { languageId, deletedAt: null },
            },
          },
        },
        categories: {
          where: {
            deletedAt: null,
          },
          include: {
            categoryTranslations: {
              where: languageId === ALL_LANGUAGE_CODE ? { deletedAt: null } : { languageId, deletedAt: null },
            },
          },
        },
      },
    })as any
  }


  create({
    createdById,
    data,
  }: {
    createdById: number
    data: CreateProductBodyType
  }): Promise<GetProductDetailResType> {
    const { skus, categories, ...productData } = data
    return this.prismaService.product.create({
      data: {
        createdById,
        ...productData,
        categories: {
          connect: categories.map((category) => ({ id: category })),
        },
        skus: {
          createMany: {
            data: skus.map((sku) => ({
              ...sku,
              createdById,
            })),
          },
        },
      },
      include: {
        productTranslations: {
          where: { deletedAt: null },
        },
        skus: {
          where: { deletedAt: null },
        },
        brand: {
          include: {
            brandTranslations: {
              where: { deletedAt: null },
            },
          },
        },
        categories: {
          where: {
            deletedAt: null,
          },
          include: {
            categoryTranslations: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })as any
  }


  async update({ id, updatedById, data }: { id: number, updatedById: number, data: UpdateProductBodyType }): Promise<ProductType> {
    const { skus: dataSkus, categories, ...productData } = data
    // SKU đã tồn tại trong DB nhưng không có trong data payload thì sẽ bị xóa
    // SKU đã tồn tại trong DB nhưng có trong data payload thì sẽ được cập nhật
    // SKY không tồn tại trong DB nhưng có trong data payload thì sẽ được thêm mới

    // 1 lấy danh sách SKU hiện tại trong DB
    const existingSkus = await this.prismaService.sKU.findMany({
      where: {
        productId: id,
        deletedAt: null
      }
    })

    //1 tìm các SÚ cần xoá (tồn tại trong db nhưng không có trong data payload)
    const skusToDelete = existingSkus.filter((sku) => dataSkus.every((dataSku) => dataSku.value !== sku.value))
    const skuIdsToDelete = skusToDelete.map((sku) => sku.id)

    // 3 mapping id vào trong data payload
    const skusWithId = dataSkus.map((dataSku) => {
      const existingSku = existingSkus.find((existingSku) => existingSku.value === dataSku.value)
      return {
        ...dataSku,
        id: existingSku ? existingSku.id : null
      }
    })

    // 4 tìm các sku để cập nhật
    const skusToUpdate = skusWithId.filter((sku) => sku.id !== null)

    // 5 tìm các sku để thêm mới
    const skusToCreate = skusWithId.filter((sku) => sku.id === null).map((sku) => {
      const { id: skuId, ...data } = sku
      return {
        ...data, productId: id, createdById: updatedById
      }
    })

    const [product] = await this.prismaService.$transaction([
      this.prismaService.product.update({
        where: {
          id,
          deletedAt: null
        },
        data: {
          ...productData,
          updatedById,
          categories: {
            connect: categories.map((category) => ({ id: category }))
          }
        }
      }),
      // xoá mềm các SKU không có trong data payload
      this.prismaService.sKU.updateMany({
        where: {
          id: {
            in: skuIdsToDelete
          }
        },
        data: {
          deletedAt: new Date(),
          deletedById: updatedById
        }
      }),
      // cập nhật các SKU có trong data payload
      ...skusToUpdate.map((sku) => this.prismaService.sKU.update({
        where: {
          id: sku.id as number
        },
        data: {
          value: sku.value, price: sku.price, stock: sku.stock, image: sku.image, updatedById
        }
      }))
    ])

    // thêm mới các Sku không có trong db
    this.prismaService.sKU.createMany({
      data: skusToCreate
    })

    return product as any
  }



  async delete(
    {
      id,
      deletedById,
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
  ): Promise<ProductType> {
    if (isHard) {
      
      return this.prismaService.product.delete({
        where: {id}
      })as any
    }
    const now = new Date()
    const [product] = await Promise.all([
      this.prismaService.product.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          deletedById,
        },
      }),
      this.prismaService.productTranslation.updateMany({
        where: {
          productId: id,
          deletedAt: null
        },
        data: {
          deletedAt: now,
          deletedById,
        }
      }),
      this.prismaService.sKU.updateMany({
        where: {
          productId: id,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          deletedById,
        },
      }),
    ])
    return product as any
  }


}