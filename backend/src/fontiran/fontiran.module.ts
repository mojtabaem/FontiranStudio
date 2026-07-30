import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FONTIRAN_PROVIDER } from './fontiran.types';
import { MockFontiranProvider } from './mock-fontiran.provider';
import { RealFontiranProvider } from './real-fontiran.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    MockFontiranProvider,
    RealFontiranProvider,
    {
      provide: FONTIRAN_PROVIDER,
      inject: [ConfigService, MockFontiranProvider, RealFontiranProvider],
      useFactory: (
        config: ConfigService,
        mock: MockFontiranProvider,
        real: RealFontiranProvider,
      ) => {
        const mode = (config.get<string>('FONTIRAN_PROVIDER') ?? 'mock').toLowerCase();
        return mode === 'real' ? real : mock;
      },
    },
  ],
  exports: [FONTIRAN_PROVIDER],
})
export class FontiranModule {}
