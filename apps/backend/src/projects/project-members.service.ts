import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { RequestContext } from '../audit/request-context';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectMembersService {
  constructor(private p: PrismaService) {}
  async project(org: string, id: string) { const item = await this.p.project.findFirst({ where: { id, organizationId: org } }); if (!item) throw new NotFoundException('Проект не найден'); return item; }
  async list(org: string, id: string) {
    const project = await this.project(org, id);
    const [orgMembers, assigned] = await Promise.all([
      this.p.organizationMember.findMany({ where: { organizationId: org, user: { isActive: true } }, include: { user: { select: { id: true, email: true, username: true, firstName: true, lastName: true } } } }),
      this.p.projectMember.findMany({ where: { projectId: id } }),
    ]);
    return orgMembers.map((member) => ({ ...member.user, organizationRole: member.role, projectRole: member.userId === project.ownerId ? MembershipRole.ADMIN : assigned.find((item) => item.userId === member.userId)?.role ?? null, isOwner: member.userId === project.ownerId }));
  }
  async put(org: string, actor: string, id: string, userId: string, role: MembershipRole) {
    await this.project(org, id);
    if (!await this.p.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: org, userId } } })) throw new BadRequestException('Пользователь не состоит в организации');
    const member = await this.p.projectMember.upsert({ where: { projectId_userId: { projectId: id, userId } }, create: { projectId: id, userId, role }, update: { role } });
    await this.p.auditLog.create({ data: { organizationId: org, userId: actor, action: 'PROJECT_MEMBER_UPDATED', entityType: 'PROJECT', entityId: id, metadata: { memberId: userId, role }, ipAddress: RequestContext.ip() } });
    return member;
  }
  async remove(org: string, actor: string, id: string, userId: string) {
    const project = await this.project(org, id);
    if (project.ownerId === userId) throw new BadRequestException('Нельзя удалить владельца проекта');
    await this.p.projectMember.deleteMany({ where: { projectId: id, userId } });
    await this.p.auditLog.create({ data: { organizationId: org, userId: actor, action: 'PROJECT_MEMBER_REMOVED', entityType: 'PROJECT', entityId: id, metadata: { memberId: userId }, ipAddress: RequestContext.ip() } });
    return { success: true };
  }
}
