import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { FontsService } from './fonts.service';

type AuthedRequest = Request & {
  user?: { id: string };
};

@Controller('fonts')
export class FontsController {
  constructor(private readonly fontsService: FontsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  listMine(@Req() req: AuthedRequest) {
    return this.fontsService.listEntitledFamilies(req.user!.id);
  }

  @Get('catalog')
  @UseGuards(OptionalJwtAuthGuard)
  catalog() {
    return this.fontsService.listCatalog();
  }

  @Get('files/:faceId')
  @UseGuards(JwtAuthGuard)
  async file(
    @Param('faceId') faceId: string,
    @Res() res: Response,
  ) {
    const { stream, fileName, contentType } =
      await this.fontsService.getFaceFile(faceId);
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileName)}"`,
    );
    stream.pipe(res);
  }
}
