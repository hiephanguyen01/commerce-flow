import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client.js';
import { Roles } from '../../../identity/presentation/decorators/roles.decorator.js';
import { CreateWarehouseDto } from '../../application/dto/create-warehouse.dto.js';
import { InventoryAvailabilityQueryDto } from '../../application/dto/inventory-availability-query.dto.js';
import { ReceiveStockDto } from '../../application/dto/receive-stock.dto.js';
import { InventoryService } from '../../application/services/inventory.service.js';

@ApiTags('admin-inventory')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('warehouses')
  @ApiOperation({
    summary: 'Create a warehouse',
  })
  createWarehouse(
    @Body()
    dto: CreateWarehouseDto,
  ) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Post('receipts')
  @ApiOperation({
    summary: 'Receive stock into a warehouse',
  })
  receiveStock(
    @Body()
    dto: ReceiveStockDto,
  ) {
    return this.inventoryService.receiveStock(dto);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'Get inventory availability',
  })
  findAvailability(
    @Query()
    query: InventoryAvailabilityQueryDto,
  ) {
    return this.inventoryService.findAvailability(
      query.warehouseId,
      query.variantId,
    );
  }
}
