import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { Request } from "express";
import { JwtUser } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import {
  CreateUserDto,
  ListAuditDto,
  ListUsersDto,
  ResetPasswordDto,
  UpdateUserDto,
} from "./users.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}
  @Get() @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD) list(
    @Req() req: Request & { user: JwtUser },
    @Query() query: ListUsersDto,
  ) {
    return this.users.list(req.user.organizationId, query);
  }
  @Get("stats") @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD) stats(
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.users.stats(req.user.organizationId);
  }
  @Get("audit") @Roles(MembershipRole.ADMIN) audit(
    @Req() req: Request & { user: JwtUser },
    @Query() query: ListAuditDto,
  ) {
    return this.users.audit(req.user.organizationId, query);
  }
  @Post() @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD) create(
    @Req() req: Request & { user: JwtUser },
    @Body() body: CreateUserDto,
  ) {
    return this.users.create(req.user, body);
  }
  @Patch(":id") @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD) update(
    @Req() req: Request & { user: JwtUser },
    @Param("id") id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.users.update(req.user, id, body);
  }
  @Post(":id/reset-password")
  @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD)
  resetPassword(
    @Req() req: Request & { user: JwtUser },
    @Param("id") id: string,
    @Body() body: ResetPasswordDto,
  ) {
    return this.users.resetPassword(req.user, id, body.password);
  }
  @Delete(":id") @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD) remove(
    @Req() req: Request & { user: JwtUser },
    @Param("id") id: string,
  ) {
    return this.users.remove(req.user, id);
  }
}
