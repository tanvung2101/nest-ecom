import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionRepo } from './permission.repo';
import { PermissionController } from './permission.controller';

@Module({
    providers: [PermissionService, PermissionRepo],
  controllers: [PermissionController],
})
export class PermissionModule {}
