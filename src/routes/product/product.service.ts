import { Injectable } from "@nestjs/common";
import { ProductRepo } from "./product.repo";
import { GetProductsQueryType } from "./product.model";
import { I18nContext } from "nestjs-i18n";
import { NotFoundRecordException } from "src/shared/error";

@Injectable()
export class ProductService {
  constructor(private productRepo: ProductRepo) { }
  async list(props: { query: GetProductsQueryType }) {
    const data = await this.productRepo.list({
       page: props.query.page,
      limit: props.query.limit,
      languageId: I18nContext.current()?.lang as string,
      isPublic: true,
      brandIds: props.query.brandIds,
      minPrice: props.query.minPrice,
      maxPrice: props.query.maxPrice,
      categories: props.query.categories,
      name: props.query.name,
      createdById: props.query.createdById,
      orderBy: props.query.orderBy,
      sortBy: props.query.sortBy, 
    })
    return data
  }

  async getDetail(props: { productId: number }) {
    const product = await this.productRepo.getDetail({ productId: props.productId, isPublic: true, languageId: I18nContext.current()?.lang as string })
    if (!product) {
      throw NotFoundRecordException
    }
    return product
  }

}