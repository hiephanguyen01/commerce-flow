import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client.js';
import { Roles } from '../../../identity/presentation/decorators/roles.decorator.js';
import { CategoryQueryDto } from '../../application/dto/category/category-query.dto.js';
import { CreateCategoryDto } from '../../application/dto/category/create-category.dto.js';
import { UpdateCategoryDto } from '../../application/dto/category/update-category.dto.js';
import { CategoryService } from '../../application/services/category.service.js';

@ApiTags('admin-categories')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a category',
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated admin categories',
  })
  findMany(@Query() query: CategoryQueryDto) {
    return this.categoryService.findAdminCategories(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
  })
  findOne(
    @Param('id', ParseUUIDPipe)
    categoryId: string,
  ) {
    return this.categoryService.findAdminCategoryById(categoryId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a category',
  })
  update(
    @Param('id', ParseUUIDPipe)
    categoryId: string,

    @Body()
    dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(categoryId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an empty category',
  })
  remove(
    @Param('id', ParseUUIDPipe)
    categoryId: string,
  ): Promise<void> {
    return this.categoryService.remove(categoryId);
  }
}
