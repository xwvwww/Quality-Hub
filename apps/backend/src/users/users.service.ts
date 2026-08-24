import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MembershipRole, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { JwtUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { RequestContext } from "../audit/request-context";
import {
  CreateUserDto,
  ListAuditDto,
  ListUsersDto,
  UpdateUserDto,
} from "./users.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(organizationId: string, query: ListUsersDto) {
    const userWhere: Prisma.UserWhereInput = {};
    if (query.active !== undefined) userWhere.isActive = query.active;
    if (query.search)
      userWhere.OR = ["email", "username", "firstName", "lastName"].map(
        (field) => ({
          [field]: { contains: query.search, mode: "insensitive" },
        }),
      );
    const where: Prisma.OrganizationMemberWhereInput = {
      organizationId,
      ...(query.role ? { role: query.role } : {}),
      user: userWhere,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.organizationMember.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.organizationMember.count({ where }),
    ]);
    return {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async stats(organizationId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      select: { role: true, user: { select: { isActive: true } } },
    });
    return {
      total: memberships.length,
      active: memberships.filter((item) => item.user.isActive).length,
      inactive: memberships.filter((item) => !item.user.isActive).length,
      roles: memberships.reduce<Record<string, number>>(
        (all, item) => ({ ...all, [item.role]: (all[item.role] ?? 0) + 1 }),
        {},
      ),
    };
  }

  async create(actor: JwtUser, body: CreateUserDto) {
    if (
      actor.role === MembershipRole.QA_LEAD &&
      body.role === MembershipRole.ADMIN
    )
      throw new ForbiddenException("QA Lead не может назначать администратора");
    const email = body.email.trim().toLowerCase(),
      username = body.username.trim().toLowerCase();
    if (
      await this.prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      })
    )
      throw new ConflictException(
        "Пользователь с таким email или логином уже существует",
      );
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          username,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          passwordHash: await argon2.hash(body.password),
          memberships: {
            create: { organizationId: actor.organizationId, role: body.role },
          },
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          userId: actor.sub,
          action: "USER_CREATED",
          entityType: "USER",
          entityId: created.id,
          metadata: { email, role: body.role },
          ipAddress: RequestContext.ip(),
        },
      });
      return created;
    });
  }

  async update(actor: JwtUser, id: string, body: UpdateUserDto) {
    const membership = await this.member(actor.organizationId, id);
    this.ensureManageable(actor, membership.role, body.role);
    if (id === actor.sub && body.isActive === false)
      throw new BadRequestException(
        "Нельзя отключить собственную учётную запись",
      );
    if (
      membership.role === MembershipRole.ADMIN &&
      ((body.role && body.role !== MembershipRole.ADMIN) ||
        body.isActive === false)
    )
      await this.ensureAnotherAdmin(actor.organizationId, id);
    return this.prisma.$transaction(async (tx) => {
      if (body.role && body.role !== membership.role)
        await tx.organizationMember.update({
          where: {
            organizationId_userId: {
              organizationId: actor.organizationId,
              userId: id,
            },
          },
          data: { role: body.role },
        });
      const updated = await tx.user.update({
        where: { id },
        data: {
          firstName: body.firstName?.trim(),
          lastName: body.lastName?.trim(),
          isActive: body.isActive,
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
      if (body.isActive === false)
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      const changes: Record<
        string,
        { from: Prisma.InputJsonValue; to: Prisma.InputJsonValue }
      > = {};
      if (
        body.firstName !== undefined &&
        body.firstName.trim() !== membership.user.firstName
      )
        changes.firstName = {
          from: membership.user.firstName,
          to: body.firstName.trim(),
        };
      if (
        body.lastName !== undefined &&
        body.lastName.trim() !== membership.user.lastName
      )
        changes.lastName = {
          from: membership.user.lastName,
          to: body.lastName.trim(),
        };
      if (
        body.isActive !== undefined &&
        body.isActive !== membership.user.isActive
      )
        changes.isActive = {
          from: membership.user.isActive,
          to: body.isActive,
        };
      if (body.role !== undefined && body.role !== membership.role)
        changes.role = { from: membership.role, to: body.role };
      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          userId: actor.sub,
          action: "USER_UPDATED",
          entityType: "USER",
          entityId: id,
          metadata: { changes },
          ipAddress: RequestContext.ip(),
        },
      });
      return { ...updated, role: body.role ?? membership.role };
    });
  }

  async resetPassword(actor: JwtUser, id: string, password: string) {
    const membership = await this.member(actor.organizationId, id);
    this.ensureManageable(actor, membership.role);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash: await argon2.hash(password) },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          userId: actor.sub,
          action: "PASSWORD_RESET",
          entityType: "USER",
          entityId: id,
          ipAddress: RequestContext.ip(),
        },
      }),
    ]);
    return { success: true };
  }

  async remove(actor: JwtUser, id: string) {
    if (id === actor.sub)
      throw new BadRequestException("Нельзя удалить себя из организации");
    const membership = await this.member(actor.organizationId, id);
    this.ensureManageable(actor, membership.role);
    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.deleteMany({
        where: {
          userId: id,
          project: { organizationId: actor.organizationId },
        },
      });
      await tx.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: actor.organizationId,
            userId: id,
          },
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          userId: actor.sub,
          action: "USER_REMOVED",
          entityType: "USER",
          entityId: id,
          metadata: { email: membership.user.email },
          ipAddress: RequestContext.ip(),
        },
      });
    });
    return { success: true };
  }

  async audit(organizationId: string, query: ListAuditDto) {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  private async member(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { user: true },
    });
    if (!membership)
      throw new NotFoundException("Пользователь не найден в организации");
    return membership;
  }
  private ensureManageable(
    actor: JwtUser,
    currentRole: MembershipRole,
    nextRole?: MembershipRole,
  ) {
    if (
      actor.role === MembershipRole.QA_LEAD &&
      (currentRole === MembershipRole.ADMIN ||
        nextRole === MembershipRole.ADMIN)
    )
      throw new ForbiddenException(
        "QA Lead не может управлять администраторами",
      );
  }
  private async ensureAnotherAdmin(
    organizationId: string,
    excludedUserId: string,
  ) {
    const count = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        role: MembershipRole.ADMIN,
        userId: { not: excludedUserId },
        user: { isActive: true },
      },
    });
    if (!count)
      throw new BadRequestException(
        "В организации должен остаться хотя бы один активный администратор",
      );
  }
}
