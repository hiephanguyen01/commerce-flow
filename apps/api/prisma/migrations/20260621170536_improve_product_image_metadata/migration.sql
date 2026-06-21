-- AlterTable
ALTER TABLE "product_images" ADD COLUMN "content_type" VARCHAR(100) NOT NULL,
ADD COLUMN "size_bytes" INTEGER NOT NULL,
ADD COLUMN "etag" VARCHAR(100),
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL;

-- Enforce at most one primary image for each product.
CREATE UNIQUE INDEX "product_images_one_primary_per_product"
ON "product_images" ("product_id")
WHERE "is_primary" = TRUE;
