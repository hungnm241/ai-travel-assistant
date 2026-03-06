import { Controller, Get, Req, Patch, Body, Put } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('/')
    async getUsers(@Req() req) {
        const currentUserId = req.user.sub;
        return this.usersService.findAllExcept(currentUserId);
    }

    @Get('me')
    async getProfile(@Req() req) {
        const userId = req.user.sub;
        return this.usersService.findOneById(userId);
    }

    @Put('me')
    async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
        const userId = req.user.sub;
        return this.usersService.update(userId, updateUserDto);
    }
}
