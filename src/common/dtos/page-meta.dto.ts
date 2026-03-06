import { ApiProperty } from '@nestjs/swagger';
import { PageOptionsDto } from './page-options.dto';

interface IPageMetaDtoParameters {
  pageOptionsDto: PageOptionsDto;
  itemCount: number;
}

export class PageMetaDto {
  @ApiProperty()
  readonly pageIndex: number;

  @ApiProperty()
  readonly pageSize: number;

  @ApiProperty()
  readonly totalItems: number;

  @ApiProperty()
  readonly totalPage: number;

  @ApiProperty()
  readonly hasPreviousPage: boolean;

  @ApiProperty()
  readonly hasNextPage: boolean;

  constructor({ pageOptionsDto, itemCount }: IPageMetaDtoParameters) {
    this.pageIndex = pageOptionsDto.page ?? 1;
    this.pageSize = pageOptionsDto.take ?? 10;
    this.totalItems = itemCount;
    this.totalPage = Math.ceil(itemCount / this.pageSize);
    this.hasPreviousPage = this.pageIndex > 1;
    this.hasNextPage = this.pageIndex < this.totalPage;
  }
}
