import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EMPTY_DESIGN_DOCUMENT } from './design.defaults';

@Injectable()
export class DesignsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string) {
    const design = await this.prisma.design.findUnique({
      where: { userId },
    });

    if (!design) {
      return {
        document: EMPTY_DESIGN_DOCUMENT,
        updatedAt: null,
      };
    }

    return {
      document: design.document,
      updatedAt: design.updatedAt,
    };
  }

  async upsertMine(userId: string, document: unknown) {
    const payload =
      document === undefined || document === null
        ? EMPTY_DESIGN_DOCUMENT
        : document;

    const design = await this.prisma.design.upsert({
      where: { userId },
      create: {
        userId,
        document: payload as Prisma.InputJsonValue,
      },
      update: {
        document: payload as Prisma.InputJsonValue,
      },
    });

    return {
      document: design.document,
      updatedAt: design.updatedAt,
    };
  }
}
