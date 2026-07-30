import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  FontiranAuthResult,
  FontiranProvider,
} from './fontiran.types';

@Injectable()
export class MockFontiranProvider implements FontiranProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticateFromCallback(_code: string): Promise<FontiranAuthResult> {
    return this.buildResult();
  }

  async getEntitlements(_fontiranUserId: string): Promise<FontiranAuthResult> {
    return this.buildResult();
  }

  private async buildResult(): Promise<FontiranAuthResult> {
    const families = await this.prisma.fontFamily.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      user: {
        id:
          this.config.get<string>('MOCK_USER_FONTIRAN_ID') ?? 'mock-user-1',
        phone: this.config.get<string>('MOCK_USER_PHONE') ?? undefined,
        email: this.config.get<string>('MOCK_USER_EMAIL') ?? undefined,
      },
      fonts: families.map((family) => ({
        fontiranId: family.fontiranId ?? family.id,
        name: family.name,
      })),
    };
  }
}
