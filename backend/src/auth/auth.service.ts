import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import {
  FONTIRAN_PROVIDER,
  type FontiranProvider,
} from '../fontiran/fontiran.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(FONTIRAN_PROVIDER)
    private readonly fontiran: FontiranProvider,
  ) {}

  async login(_body?: unknown) {
    const result = await this.fontiran.authenticateFromCallback('mock');

    const user = await this.prisma.user.upsert({
      where: { fontiranId: result.user.id },
      create: {
        fontiranId: result.user.id,
        phone: result.user.phone,
        email: result.user.email,
      },
      update: {
        phone: result.user.phone,
        email: result.user.email,
      },
    });

    await this.syncEntitlements(user.id, result.fonts);

    const fonts = await this.getUserFonts(user.id);
    const token = await this.jwt.signAsync({
      sub: user.id,
      fontiranId: user.fontiranId,
    });

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fonts,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const fonts = await this.getUserFonts(user.id);
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fonts,
    };
  }

  logout() {
    return { ok: true };
  }

  private async syncEntitlements(
    userId: string,
    entitlements: { fontiranId: string; name: string }[],
  ) {
    for (const entitlement of entitlements) {
      let family = await this.prisma.fontFamily.findFirst({
        where: {
          OR: [
            { fontiranId: entitlement.fontiranId },
            { id: entitlement.fontiranId },
            { name: entitlement.name },
          ],
        },
      });

      if (!family) {
        family = await this.prisma.fontFamily.create({
          data: {
            fontiranId: entitlement.fontiranId,
            name: entitlement.name,
          },
        });
      } else if (!family.fontiranId) {
        family = await this.prisma.fontFamily.update({
          where: { id: family.id },
          data: { fontiranId: entitlement.fontiranId },
        });
      }

      await this.prisma.userFont.upsert({
        where: {
          userId_familyId: {
            userId,
            familyId: family.id,
          },
        },
        create: {
          userId,
          familyId: family.id,
        },
        update: {},
      });
    }
  }

  private async getUserFonts(userId: string) {
    const rows = await this.prisma.userFont.findMany({
      where: { userId },
      include: { family: true },
      orderBy: { family: { name: 'asc' } },
    });

    return rows.map((row) => ({
      id: row.family.id,
      fontiranId: row.family.fontiranId ?? row.family.id,
      name: row.family.name,
    }));
  }
}
