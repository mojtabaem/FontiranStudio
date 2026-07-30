import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { DesignsModule } from './designs/designs.module';
import { FontiranModule } from './fontiran/fontiran.module';
import { FontsModule } from './fonts/fonts.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FontiranModule,
    AuthModule,
    FontsModule,
    DesignsModule,
    AdminModule,
  ],
})
export class AppModule {}
