import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
export class CommentQueryDto { @IsIn(['TEST_CASE','REQUIREMENT','DEFECT','TEST_PLAN','TEST_RUN']) entityType!: string; @IsUUID() entityId!: string; }
export class CreateCommentDto extends CommentQueryDto { @IsString() @MinLength(1) @MaxLength(5000) body!: string; }
