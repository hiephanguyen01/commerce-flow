import { Module } from '@nestjs/common';
import { InventoryAdminQueryService } from './application/services/inventory-admin-query.service.js';
import { InventoryReservationExpirationService } from './application/services/inventory-reservation-expiration.service.js';
import { InventoryService } from './application/services/inventory.service.js';
import { InventoryReservationExpirationWorker } from './infrastructure/workers/inventory-reservation-expiration.worker.js';
import { AdminInventoryController } from './presentation/http/admin-inventory.controller.js';

@Module({
  controllers: [AdminInventoryController],

  providers: [
    InventoryService,
    InventoryAdminQueryService,
    InventoryReservationExpirationService,
    InventoryReservationExpirationWorker,
  ],

  exports: [
    InventoryService,
    InventoryAdminQueryService,
    InventoryReservationExpirationService,
  ],
})
export class InventoryModule {}
