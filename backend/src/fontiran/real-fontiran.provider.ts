import { Injectable } from '@nestjs/common';
import {
  FontiranAuthResult,
  FontiranProvider,
} from './fontiran.types';

@Injectable()
export class RealFontiranProvider implements FontiranProvider {
  async authenticateFromCallback(_code: string): Promise<FontiranAuthResult> {
    throw new Error('not implemented');
  }

  async getEntitlements(_fontiranUserId: string): Promise<FontiranAuthResult> {
    throw new Error('not implemented');
  }
}
