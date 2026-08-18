import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { JwtUser } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest<{ user: JwtUser }>().user;
    const effectiveRole = user?.role === MembershipRole.BUSINESS_ANALYST ? MembershipRole.QA_ENGINEER : user?.role;
    if (!user || !effectiveRole || !roles.includes(effectiveRole)) throw new ForbiddenException('Недостаточно прав');
    return true;
  }
}
