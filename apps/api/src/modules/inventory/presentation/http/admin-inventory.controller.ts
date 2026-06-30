import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client.js';
import { Roles } from '../../../identity/presentation/decorators/roles.decorator.js';
import { AdjustInventoryDto } from '../../application/dto/adjust-inventory.dto.js';
import { CreateWarehouseDto } from '../../application/dto/create-warehouse.dto.js';
import { InventoryAvailabilityQueryDto } from '../../application/dto/inventory-availability-query.dto.js';
import { ListInventoryItemsQueryDto } from '../../application/dto/list-inventory-items-query.dto.js';
import { ListInventoryMovementsQueryDto } from '../../application/dto/list-inventory-movements-query.dto.js';
import { ListWarehousesQueryDto } from '../../application/dto/list-warehouses-query.dto.js';
import { LowStockQueryDto } from '../../application/dto/low-stock-query.dto.js';
import { ReceiveStockDto } from '../../application/dto/receive-stock.dto.js';
import { UpdateWarehouseStatusDto } from '../../application/dto/update-warehouse-status.dto.js';
import { InventoryAdminQueryService } from '../../application/services/inventory-admin-query.service.js';
import { InventoryService } from '../../application/services/inventory.service.js';

@ApiTags('admin-inventory')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(
    private readonly inventoryService: InventoryService,

    private readonly queryService: InventoryAdminQueryService,
  ) {}

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

  @Get('warehouses')
  @ApiOperation({
    summary: 'List warehouses',
  })
  findWarehouses(
    @Query()
    query: ListWarehousesQueryDto,
  ) {
    return this.queryService.findWarehouses(query);
  }

  @Patch('warehouses/:warehouseId/status')
  @ApiOperation({
    summary: 'Update warehouse status',
  })
  updateWarehouseStatus(
    @Param('warehouseId', ParseUUIDPipe)
    warehouseId: string,

    @Body()
    dto: UpdateWarehouseStatusDto,
  ) {
    return this.inventoryService.updateWarehouseStatus(warehouseId, dto);
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

  @Post('adjustments')
  @ApiOperation({
    summary: 'Adjust on-hand inventory',
  })
  adjustInventory(
    @Body()
    dto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjustInventory(dto);
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

  @Get('items')
  @ApiOperation({
    summary: 'List inventory items',
  })
  findInventoryItems(
    @Query()
    query: ListInventoryItemsQueryDto,
  ) {
    return this.queryService.findInventoryItems(query);
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'List low-stock inventory items',
  })
  findLowStock(
    @Query()
    query: LowStockQueryDto,
  ) {
    return this.queryService.findLowStock(query);
  }

  @Get('movements')
  @ApiOperation({
    summary: 'List inventory movements',
  })
  findMovements(
    @Query()
    query: ListInventoryMovementsQueryDto,
  ) {
    return this.queryService.findMovements(query);
  }
}
