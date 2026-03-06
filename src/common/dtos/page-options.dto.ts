import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Order } from '../constants/order.constant';

export class PageOptionsDto {
    @ApiPropertyOptional({
        enum: Order,
        default: Order.DESC
    })
    @IsEnum(Order)
    @IsOptional()
    readonly order?: Order = Order.DESC;

    @ApiProperty()
    @IsOptional()
    readonly orderBy?: any = 'id';

    @ApiPropertyOptional({
        minimum: 1,
        default: 1
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    readonly page?: number = 1;

    @ApiPropertyOptional({
        minimum: 1,
        default: 10
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    readonly take?: number = 10;

    get skip(): number {
        return ((this.page ?? 1) - 1) * (this.take ?? 10);
    }
}
