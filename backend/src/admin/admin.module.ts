import { Module } from '@nestjs/common';
import { AdminApiController, AdminPageController } from './admin.controller';
import { AdminTokenGuard } from './admin-token.guard';

@Module({
  controllers: [AdminPageController, AdminApiController],
  providers: [AdminTokenGuard],
})
export class AdminModule {}
