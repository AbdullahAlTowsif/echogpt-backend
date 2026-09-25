import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

  async getProfile(userId: string) {
    const user = await this.prisma.db.orm.public.User.where({ id: userId }).first();
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, emailVerificationToken, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.db.orm.public.User.where({ id: userId }).update(dto);
    if (!user) throw new NotFoundException('User not found');

    const { passwordHash, emailVerificationToken, ...safeUser } = user;
    return safeUser;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.db.orm.public.User.where({ id: userId }).first();
    if (!user) throw new NotFoundException('User not found');

    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.db.orm.public.User.where({ id: userId }).update({ passwordHash });
    return { message: 'Password updated' };
  }

  async deleteAccount(userId: string) {
    await this.prisma.db.orm.public.User.where({ id: userId }).delete();
    return { message: 'Account deleted' };
  }
}
