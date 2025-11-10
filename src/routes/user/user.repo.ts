import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { CreateUserBodyType, GetUsersQueryType, GetUsersResType } from "./user.model";
import { UserType } from "src/shared/models/shared-user.model";

@Injectable()
export class UserRepo {
    constructor(private prismaService: PrismaService) { }

    async list(panigation: GetUsersQueryType): Promise<GetUsersResType> {
        const skip = (panigation.page - 1) * panigation.limit
        const take = panigation.limit
        const [totalItems, data] = await Promise.all([
            this.prismaService.user.count({
                where: {
                    deletedAt: null
                }
            }),
            this.prismaService.user.findMany({
                where: {
                    deletedAt: null
                },
                skip,
                take,
                include: {
                    role: true
                }
            })
        ])

        return {
            data,
            totalItems,
            page: panigation.page,
            limit: panigation.limit,
            totalPages: Math.ceil(totalItems / panigation.limit),
        }as any
    }

    create({ createdById, data }: { createdById: number | null; data: CreateUserBodyType }): Promise<UserType> {
        return this.prismaService.user.create({
            data: {
                ...data,
                createdById,
            },
        })as any
    }

    delete({id, deletedById}: {id: number ; deletedById: number},isHard?: boolean):Promise<UserType>{
        return (isHard ? this.prismaService.user.delete({
            where: {
                id
            }
        }): this.prismaService.user.update({
            where: {
                id,
                deletedAt: null
            },
            data: {
                deletedAt: new Date(),
                deletedById
            }
        })) as any
    }


}