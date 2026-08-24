import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MembershipRole, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { RequestContext } from "../audit/request-context";
import {
  CreateOrganizationDto,
  CreateSystemUserDto,
  UpdateOrganizationDto,
  UpdateSystemProfileDto,
  UpdateSystemUserDto,
} from "./system-admin.dto";
@Injectable()
export class SystemAdminService {
  constructor(private prisma: PrismaService) {}
  async stats() {
    const [
      organizations,
      users,
      activeUsers,
      blockedUsers,
      auditEvents,
      recentLogins,
      roles,
    ] = await this.prisma.$transaction([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: {
          action: "LOGIN_SUCCESS",
          createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      }),
      this.prisma.organizationMember.groupBy({
        by: ["role"],
        _count: true,
        orderBy: { role: "asc" },
      }),
    ]);
    return {
      organizations,
      users,
      activeUsers,
      blockedUsers,
      auditEvents,
      recentLogins,
      roles: Object.fromEntries(roles.map((item) => [item.role, item._count])),
      health: { database: "online", api: "online" },
    };
  }
  profile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }
  async updateProfile(id: string, dto: UpdateSystemProfileDto) {
    const before = await this.profile(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { firstName: dto.firstName.trim(), lastName: dto.lastName.trim() },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    await this.log(id, null, "SYSTEM_PROFILE_UPDATED", "USER", id, {
      changes: {
        firstName: { from: before?.firstName, to: user.firstName },
        lastName: { from: before?.lastName, to: user.lastName },
      },
    });
    return user;
  }
  organizations() {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true, projects: true, auditLogs: true } },
      },
    });
  }
  async organization(id: string) {
    const item = await this.prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true, projects: true, auditLogs: true } },
        projects: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            createdAt: true,
            _count: {
              select: { testCases: true, testPlans: true, testRuns: true },
            },
          },
        },
        members: {
          orderBy: { createdAt: "desc" },
          select: {
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException("Организация не найдена");
    return item;
  }
  async createOrganization(actorId: string, dto: CreateOrganizationDto) {
    try {
      const item = await this.prisma.organization.create({
        data: { name: dto.name.trim(), slug: dto.slug.trim().toLowerCase() },
      });
      await this.log(
        actorId,
        item.id,
        "ORGANIZATION_CREATED",
        "ORGANIZATION",
        item.id,
        { name: item.name, slug: item.slug },
      );
      return item;
    } catch (e) {
      this.unique(e, "Организация с таким slug уже существует");
      throw e;
    }
  }
  async updateOrganization(
    actorId: string,
    id: string,
    dto: UpdateOrganizationDto,
  ) {
    const before = await this.organization(id);
    try {
      const item = await this.prisma.organization.update({
        where: { id },
        data: { name: dto.name?.trim(), slug: dto.slug?.trim().toLowerCase() },
      });
      await this.log(actorId, id, "ORGANIZATION_UPDATED", "ORGANIZATION", id, {
        changes: {
          name: { from: before.name, to: item.name },
          slug: { from: before.slug, to: item.slug },
        },
      });
      return item;
    } catch (e) {
      this.unique(e, "Организация с таким slug уже существует");
      throw e;
    }
  }
  async deleteOrganization(actorId: string, id: string) {
    const item = await this.organization(id);
    await this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
    await this.log(
      actorId,
      id,
      "ORGANIZATION_DEACTIVATED",
      "ORGANIZATION",
      id,
      { changes: { isActive: { from: item.isActive, to: false } } },
    );
    return { success: true };
  }
  users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isSystemAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            role: true,
            createdAt: true,
            organization: { select: { id: true, name: true } },
          },
        },
      },
    });
  }
  async createUser(actorId: string, dto: CreateSystemUserDto) {
    if (
      !(await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      }))
    )
      throw new NotFoundException("Организация не найдена");
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          username: dto.username.trim().toLowerCase(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          passwordHash: await argon2.hash(dto.password),
          memberships: {
            create: { organizationId: dto.organizationId, role: dto.role },
          },
        },
      });
      await this.log(
        actorId,
        dto.organizationId,
        "SYSTEM_USER_CREATED",
        "USER",
        user.id,
        { email: user.email, role: dto.role },
      );
      return { success: true, id: user.id };
    } catch (e) {
      this.unique(e, "Email или логин уже занят");
      throw e;
    }
  }
  async updateUser(actorId: string, id: string, dto: UpdateSystemUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { memberships: true },
    });
    if (!user) throw new NotFoundException("Пользователь не найден");
    if (user.isSystemAdmin && dto.isActive === false)
      throw new BadRequestException(
        "Системного администратора нельзя отключить",
      );
    const current = user.memberships[0],
      organizationId = dto.organizationId ?? current?.organizationId;
    if (!organizationId) throw new BadRequestException("Выберите организацию");
    if (
      dto.organizationId &&
      dto.organizationId !== current?.organizationId &&
      (await this.prisma.project.count({ where: { ownerId: id } }))
    )
      throw new BadRequestException(
        "Сначала передайте проекты другому владельцу",
      );
    const changes: Record<string, unknown> = {};
    for (const key of ["firstName", "lastName", "isActive"] as const)
      if (dto[key] !== undefined && dto[key] !== user[key])
        changes[key] = { from: user[key], to: dto[key] };
    if (dto.role && dto.role !== current?.role)
      changes.role = { from: current?.role, to: dto.role };
    if (dto.organizationId && dto.organizationId !== current?.organizationId)
      changes.organizationId = {
        from: current?.organizationId,
        to: dto.organizationId,
      };
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          firstName: dto.firstName?.trim(),
          lastName: dto.lastName?.trim(),
          isActive: dto.isActive,
        },
      });
      if (dto.organizationId || dto.role) {
        await tx.organizationMember.deleteMany({ where: { userId: id } });
        await tx.organizationMember.create({
          data: {
            userId: id,
            organizationId,
            role: dto.role ?? current?.role ?? MembershipRole.VIEWER,
          },
        });
      }
      if (dto.isActive === false)
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: actorId,
          action: "SYSTEM_USER_UPDATED",
          entityType: "USER",
          entityId: id,
          metadata: { changes } as Prisma.InputJsonObject,
          ipAddress: RequestContext.ip(),
        },
      });
    });
    return { success: true };
  }
  disableUser(actorId: string, id: string) {
    return this.updateUser(actorId, id, { isActive: false });
  }
  async resetPassword(actorId: string, id: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { memberships: true },
    });
    if (!user) throw new NotFoundException("Пользователь не найден");
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash: await argon2.hash(password) },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.log(
      actorId,
      user.memberships[0]?.organizationId ?? null,
      "SYSTEM_USER_PASSWORD_RESET",
      "USER",
      id,
      { changes: { password: { from: "скрыто", to: "изменён" } } },
    );
    return { success: true };
  }
  sessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  }
  async revokeSession(userId: string, id: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: result.count > 0 };
  }
  notifications() {
    return this.prisma.auditLog.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        createdAt: true,
        metadata: true,
        user: { select: { firstName: true, lastName: true } },
        organization: { select: { name: true } },
      },
    });
  }
  audit(adminOnly: boolean) {
    const actions = [
      "SYSTEM_USER_CREATED",
      "SYSTEM_USER_UPDATED",
      "ORGANIZATION_CREATED",
      "ORGANIZATION_UPDATED",
      "ORGANIZATION_DEACTIVATED",
      "SYSTEM_PROFILE_UPDATED",
    ];
    return this.prisma.auditLog.findMany({
      take: 500,
      where: adminOnly
        ? { action: { in: actions } }
        : { action: { notIn: actions } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        organization: { select: { name: true } },
      },
    });
  }
  private async log(
    userId: string,
    organizationId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Prisma.InputJsonObject,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress: RequestContext.ip(),
      },
    });
  }
  private unique(error: unknown, message: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictException(message);
  }
}
