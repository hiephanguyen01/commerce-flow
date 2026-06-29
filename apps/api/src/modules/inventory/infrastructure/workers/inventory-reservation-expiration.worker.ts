import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InventoryReservationExpirationService } from '../../application/services/inventory-reservation-expiration.service.js';

export type ExpirationCycleResult = {
  batches: number;
  claimed: number;
  expired: number;
};

@Injectable()
export class InventoryReservationExpirationWorker {
  private readonly logger = new Logger(
    InventoryReservationExpirationWorker.name,
  );

  private readonly enabled: boolean;
  private readonly batchSize: number;
  private readonly maximumBatches: number;

  constructor(
    private readonly expirationService: InventoryReservationExpirationService,

    configService: ConfigService,
  ) {
    this.enabled = configService.get<boolean>(
      'INVENTORY_EXPIRATION_WORKER_ENABLED',
      true,
    );

    this.batchSize = this.normalizeInteger(
      configService.get<number>('INVENTORY_EXPIRATION_BATCH_SIZE', 100),
      1,
      500,
      100,
    );

    this.maximumBatches = this.normalizeInteger(
      configService.get<number>('INVENTORY_EXPIRATION_MAX_BATCHES_PER_RUN', 10),
      1,
      100,
      10,
    );
  }

  /*
   * Chạy mỗi 10 giây.
   *
   * waitForCompletion ngăn chính cron này chạy chồng
   * trong cùng một Node.js process.
   *
   * Nhiều process vẫn có thể chạy đồng thời; phần đó
   * được bảo vệ bằng FOR UPDATE SKIP LOCKED.
   */
  @Cron('*/10 * * * * *', {
    name: 'inventory-reservation-expiration',

    waitForCompletion: true,
  })
  async handleCron(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const result = await this.runExpirationCycle(new Date());

      if (result.expired > 0) {
        this.logger.log(
          [
            'Expired inventory reservations.',
            `batches=${result.batches}`,
            `claimed=${result.claimed}`,
            `expired=${result.expired}`,
          ].join(' '),
        );
      }
    } catch (error) {
      this.logger.error(
        'Inventory reservation expiration cycle failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /*
   * Public để unit/integration test có thể truyền now
   * cố định mà không cần thay đổi global system clock.
   */
  async runExpirationCycle(now: Date): Promise<ExpirationCycleResult> {
    let batches = 0;
    let claimed = 0;
    let expired = 0;

    for (
      let batchIndex = 0;
      batchIndex < this.maximumBatches;
      batchIndex += 1
    ) {
      const result = await this.expirationService.expireDueBatch({
        now,
        batchSize: this.batchSize,
      });

      batches += 1;
      claimed += result.claimed;
      expired += result.expired;

      /*
       * Batch chưa đầy nghĩa là tại thời điểm claim
       * không còn đủ due reservation để chạy tiếp.
       */
      if (result.claimed < this.batchSize) {
        break;
      }
    }

    return {
      batches,
      claimed,
      expired,
    };
  }

  private normalizeInteger(
    value: number,
    minimum: number,
    maximum: number,
    fallback: number,
  ): number {
    if (!Number.isInteger(value)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, value));
  }
}
