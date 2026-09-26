import { Body, Controller, Delete, Get, Inject, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
    constructor(@Inject(AdminService) private readonly adminService: AdminService) { }

    @Get('dashboard')
    dashboard() {
        return this.adminService.dashboardStats();
    }

    @Get('users')
    listUsers() {
        return this.adminService.listUsers();
    }

    @Patch('users/:id/active')
    setUserActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.adminService.setUserActive(id, isActive);
    }

    @Delete('users/:id')
    deleteUser(@Param('id') id: string) {
        return this.adminService.deleteUser(id);
    }

    @Get('subscriptions')
    listSubscriptions() {
        return this.adminService.listSubscriptions();
    }

    @Patch('subscriptions/:id')
    updateSubscription(@Param('id') id: string, @Body() patch: Record<string, unknown>) {
        return this.adminService.updateSubscription(id, patch);
    }

    @Get('ai-providers')
    listAiProviders() {
        return this.adminService.listAiProviders();
    }

    @Patch('ai-providers/:id/enabled')
    setAiProviderEnabled(@Param('id') id: string, @Body('isEnabled') isEnabled: boolean) {
        return this.adminService.setAiProviderEnabled(id, isEnabled);
    }

    @Get('analytics/usage')
    usageAnalytics() {
        return this.adminService.usageAnalytics();
    }

    @Get('logs')
    requestLogs() {
        return this.adminService.requestLogs();
    }

    @Get('system-health')
    systemHealth() {
        return this.adminService.systemHealth();
    }
}
