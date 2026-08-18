import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { WorkspaceService } from './workspace.service';

type AuthRequest = Request & { user: JwtUser };

@Controller('workspace')
export class WorkspaceController {
  constructor(private service: WorkspaceService) {}

  @Get('search')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  search(@Req() req: AuthRequest, @Query('q') query = '') { return this.service.search(req.user.organizationId, query); }

  @Get('notifications')
  notifications(@Req() req: AuthRequest) { return this.service.listNotifications(req.user.sub); }

  @Patch('notifications/read-all')
  readAll(@Req() req: AuthRequest) { return this.service.readAll(req.user.sub); }

  @Patch('notifications/:id/read')
  read(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.read(req.user.sub, id); }
}
