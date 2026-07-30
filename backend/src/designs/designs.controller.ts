import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DesignsService } from './designs.service';

type AuthedRequest = Request & {
  user: { id: string };
};

@Controller('designs')
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMine(@Req() req: AuthedRequest) {
    return this.designsService.getMine(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  upsertMine(
    @Req() req: AuthedRequest,
    @Body() body: { document?: unknown },
  ) {
    return this.designsService.upsertMine(req.user.id, body?.document);
  }
}
