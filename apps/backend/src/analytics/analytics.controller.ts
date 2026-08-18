import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { AnalyticsQueryDto } from './analytics.dto';
import { AnalyticsService } from './analytics.service';
@ApiTags('analytics') @ApiBearerAuth() @Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}
  @Get() get(@Req() req: Request & { user: JwtUser }, @Query() query: AnalyticsQueryDto) { return this.service.get(req.user.organizationId, query); }
}
