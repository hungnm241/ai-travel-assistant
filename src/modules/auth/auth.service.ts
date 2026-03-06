import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) {}

    async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        return user;
    }

    async register(registerDto: RegisterDto) {
        try {
            const existingUser = await this.prisma.user.findFirst({
                where: { email: registerDto.email }
            });
    
            if (existingUser) {
                throw new ConflictException('Email đã tồn tại');
            }
    
            if (registerDto.password !== registerDto.confirmPassword) {
                throw new ConflictException('Mật khẩu không khớp');
            }
    
            const passwordHash = await this.hashPassword(registerDto.password);
            
            const user = await this.prisma.user.create({
                data: {
                    email: registerDto.email,
                    fullName: registerDto.fullName,
                    password: passwordHash
                }
            });
    
            return this.generateTokens(user);
        } catch (error) {
            console.error(error);
            throw new Error('Lỗi khi đăng ký');
        }
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        
        if (!user) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
        }

        return this.generateTokens({ id: user.id, email: user.email, fullName: user.fullName });
    }

    async generateTokens(user: { id: bigint; email: string; fullName: string | null }) {
        const payload = {
            userId: user.id.toString(),
            fullName: user.fullName || user.email,
            email: user.email
        };

        const accessToken = this.jwtService.sign(payload);

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: '1y',
            secret: this.configService.get<string>('SECRET_JWT_KEY')
        });

        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken }
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: Number(user.id),
                email: user.email,
                fullName: user.fullName
            }
        };
    }
}
