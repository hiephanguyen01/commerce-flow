-- Enforce at most one primary image for each product.
CREATE UNIQUE INDEX "product_images_one_primary_per_product"
ON "product_images" ("product_id")
WHERE "is_primary" = TRUE;
