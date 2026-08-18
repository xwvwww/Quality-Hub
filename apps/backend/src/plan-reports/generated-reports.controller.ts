import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MembershipRole } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { CreateGeneratedReportDto, GeneratedReportQueryDto } from './generated-reports.dto';
import { GeneratedReportsService } from './generated-reports.service';

type AuthRequest = Request & { user: JwtUser };
const creators = [MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER] as const;

@Controller('reports/generated')
export class GeneratedReportsController {
  constructor(private service: GeneratedReportsService) {}
  @Get() list(@Req() req: AuthRequest, @Query() query: GeneratedReportQueryDto) { return this.service.list(req.user.organizationId, query); }
  @Get(':id/download') async download(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.service.file(req.user.organizationId, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(file.path);
  }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.detail(req.user.organizationId, id); }
  @Post() @Roles(...creators) @Throttle({ default: { limit: 10, ttl: 60_000 } }) create(@Req() req: AuthRequest, @Body() dto: CreateGeneratedReportDto) { return this.service.create(req.user.organizationId, req.user.sub, dto); }
}
