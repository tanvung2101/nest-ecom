import { Injectable } from "@nestjs/common";
import { ReviewRepository } from "./review.repo";
import { PaginationQueryType } from "src/shared/models/request.model";
import { CreateReviewBodyType, UpdateReviewBodyType } from "./review.model";

@Injectable()
export class ReviewService {
    constructor(private readonly reviewRepository: ReviewRepository){}

    list(productId: number, paginaton: PaginationQueryType){
        return this.reviewRepository.list(productId, paginaton)
    }

    async create(userId: number, body: CreateReviewBodyType){
        return this.reviewRepository.create(userId,body)
    }

    async update({userId, reviewId, body}: {userId: number, reviewId: number, body:UpdateReviewBodyType}){
        return this.reviewRepository.update({
            userId,reviewId,body
        })
    }
}