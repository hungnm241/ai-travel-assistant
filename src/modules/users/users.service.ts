import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async findAllExcept(excludeUserId: number) {
        const users = await this.prisma.user.findMany({
            where: {
                id: { not: BigInt(excludeUserId) }
            },
            select: {
                id: true,
                fullName: true,
                email: true
            },
            orderBy: { id: 'asc' }
        });

        return users.map(user => ({
            ...user,
            id: Number(user.id)
        }));
    }

    async findOneById(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: BigInt(id) },
            select: {
                id: true,
                fullName: true,
                email: true,
                gender: true,
                birthDate: true,
                city: true,
                department: true,
                address: true,
                phoneNumber: true,
                role: true,
                status: true,
                createdAt: true,
                deviceId: true,
            }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        return {
            ...user,
            id: Number(user.id)
        };
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({ 
            where: { id: BigInt(id) }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: BigInt(id) },
            data: updateUserDto,
            select: {
                id: true,
                fullName: true,
                email: true,
                status: true,
                gender: true,
                birthDate: true,
                city: true,
                department: true,
                address: true,
                phoneNumber: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return {
            ...updatedUser,
            id: Number(updatedUser.id)
        };
    }
}
