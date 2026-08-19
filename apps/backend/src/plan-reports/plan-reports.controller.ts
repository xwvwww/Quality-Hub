import { Controller, Get, Headers, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { PlanReportsService } from './plan-reports.service';

@ApiTags('plan-reports')
@ApiBearerAuth()
@Controller('reports/test-plans')
export class PlanReportsController {
  constructor(private service: PlanReportsService) {}

  @Get(':id')
  get(@Req() request: Request & { user: JwtUser }, @Param('id', ParseUUIDPipe) id: string, @Query('scope') scope?: string, @Headers('referer') referer?: string) {
    const failedOnly = scope === 'failed' || (scope === undefined && referer?.includes('scope=failed') === true);
    return this.service.get(request.user.organizationId, id, failedOnly);
  }
}
