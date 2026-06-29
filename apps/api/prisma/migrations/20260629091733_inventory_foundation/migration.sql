/*
  Warnings:

  - A unique constraint covering the columns `[reservation_id,type]` on the table `inventory_movements` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_reservation_type_key" ON "inventory_movements"("reservation_id", "type");
