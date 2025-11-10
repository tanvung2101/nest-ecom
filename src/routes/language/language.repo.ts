import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { CreateLanguageBodyType, LanguageType, UpdateLanguageBodyType } from "./language.model";

@Injectable()
export class LanguageRepo {

    constructor(private prismaService: PrismaService) { }

    findAll(): Promise<LanguageType[]> {
        return this.prismaService.language.findMany({
            where: {
                deletedAt: null
            }
        }) as any
    }

    findById(id: string): Promise<LanguageType | null> {
        return this.prismaService.language.findUnique({
            where: {
                id,
                deletedAt: null
            }
        }) as any
    }

    create({ createdById, data }: { createdById: number; data: CreateLanguageBodyType }): Promise<LanguageType> {
        return this.prismaService.language.create({
            data: {
                ...data,
                createdById,
            }
        }) as any
    }

    update({ id, updatedById, data }: { id: string, updatedById: number, data: UpdateLanguageBodyType }): Promise<LanguageType> {
        return this.prismaService.language.update({
            where: {
                id, deletedAt: null
            },
            data: {
                ...data,
                updatedById
            }
        }) as any
    }

    delete(id: string, isHard?: boolean): Promise<LanguageType> {
        return (
            isHard
                ? this.prismaService.language.delete({
                    where: {
                        id,
                    },
                })
                : this.prismaService.language.update({
                    where: {
                        id,
                        deletedAt: null,
                    },
                    data: {
                        deletedAt: new Date(),
                    },
                })
        ) as any
    }


}