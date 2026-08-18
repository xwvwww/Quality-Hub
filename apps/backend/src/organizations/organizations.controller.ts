import { Controller, Get, NotFoundException, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private prisma: PrismaService) {}

  @Get('current')
  async current(@Req() req: Request & { user: JwtUser }) {
    const org = await this.prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { id: true, name: true, slug: true, createdAt: true, _count: { select: { members: true, projects: true } } },
    });
    if (!org) throw new NotFoundException('Организация не найдена');
    return org;
  }
}
