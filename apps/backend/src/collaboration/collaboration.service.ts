import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './collaboration.dto';

@Injectable()
export class CollaborationService {
  constructor(private prisma: PrismaService) {}
  async list(organizationId: string, entityType: string, entityId: string) {
    await this.entity(organizationId, entityType, entityId);
    return this.prisma.comment.findMany({ where: { organizationId, entityType, entityId }, include: { author: { select: { id: true, username: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' } });
  }
  async create(organizationId: string, userId: string, dto: CreateCommentDto) {
    await this.entity(organizationId, dto.entityType, dto.entityId);
    const comment = await this.prisma.comment.create({ data: { organizationId, entityType: dto.entityType, entityId: dto.entityId, body: dto.body.trim(), authorId: userId }, include: { author: { select: { id: true, username: true, firstName: true, lastName: true } } } });
    const usernames = [...new Set([...dto.body.matchAll(/@([a-zA-Z0-9._-]+)/g)].map((match) => match[1].toLowerCase()))];
    if (usernames.length) {
      const users = await this.prisma.user.findMany({ where: { username: { in: usernames }, memberships: { some: { organizationId } }, id: { not: userId } }, select: { id: true } });
      const url = this.entityUrl(dto.entityType, dto.entityId);
      if (users.length) await this.prisma.notification.createMany({ data: users.map((user) => ({ userId: user.id, title: 'Вас упомянули в комментарии', body: `${comment.author.firstName} ${comment.author.lastName}: ${dto.body.slice(0, 180)}`, url })) });
    }
    return comment;
  }
  async remove(organizationId: string, userId: string, id: string, isAdmin: boolean) {
    const item = await this.prisma.comment.findFirst({ where: { id, organizationId } });
    if (!item || (item.authorId !== userId && !isAdmin)) throw new NotFoundException('Комментарий не найден');
    await this.prisma.comment.delete({ where: { id } });
    return { success: true };
  }
  private entityUrl(type: string, id: string) {
    const paths: Record<string, string> = { TEST_CASE: 'test-cases', REQUIREMENT: 'requirements', DEFECT: 'defects', TEST_PLAN: 'test-plans', TEST_RUN: 'test-runs' };
    return `/${paths[type] ?? 'dashboard'}/${id}`;
  }
  private async entity(organizationId: string, type: string, id: string) {
    const found = type === 'TEST_CASE' ? await this.prisma.testCase.findFirst({ where: { id, project: { organizationId } } })
      : type === 'REQUIREMENT' ? await this.prisma.requirement.findFirst({ where: { id, project: { organizationId } } })
      : type === 'DEFECT' ? await this.prisma.defect.findFirst({ where: { id, project: { organizationId } } })
      : type === 'TEST_PLAN' ? await this.prisma.testPlan.findFirst({ where: { id, project: { organizationId } } })
      : await this.prisma.testRun.findFirst({ where: { id, project: { organizationId } } });
    if (!found) throw new NotFoundException('Объект не найден');
  }
}
