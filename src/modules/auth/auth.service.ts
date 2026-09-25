import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { instantAfterMs, parseDurationMs } from '../../common/utils/time.util.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { Temporal } from 'temporal-polyfill';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) { }

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.db.orm.public.User.where({ email: dto.email }).first();
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const userRole = await this.prisma.db.orm.public.Role.where({ name: 'USER' }).first();
    if (!userRole) {
      throw new Error('USER role is not seeded — run `npm run prisma:seed`.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.db.orm.public.User.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roleId: userRole.id,
    });

    await this.prisma.db.orm.public.Subscription.create({
      userId: user.id,
      plan: 'FREE',
      status: 'ACTIVE',
      requestLimit: 50,
      requestsUsed: 0,
    });

    return this.issueTokens(user.id, user.email, userRole.name);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.db.orm.public.User.where({ email: dto.email }).first();
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const role = await this.prisma.db.orm.public.Role.where({ id: user.roleId }).first();

    return this.issueTokens(user.id, user.email, role?.name ?? 'USER');
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.db.orm.public.Session.where({
      userId: payload.sub,
      refreshTokenHash: tokenHash,
    }).first();

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    await this.prisma.db.orm.public.Session.where({ id: session.id }).update({
      revokedAt: Temporal.Now.instant(),
    });

    return this.issueTokens(payload.sub, payload.email, payload.role);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.db.orm.public.Session.where({
      userId,
      refreshTokenHash: tokenHash,
    }).update({ revokedAt: Temporal.Now.instant() });
    return { message: 'Logged out' };
  }

  private async issueTokens(userId: string, email: string, role: string): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn', '7d');
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    await this.prisma.db.orm.public.Session.create({
      userId,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt: instantAfterMs(parseDurationMs(refreshExpiresIn)),
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
