'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePublicProduct } from '../hooks/use-public-product';
import type { PublicProductImage, PublicProductVariant } from '../types/catalog';

type CatalogProductDetailProps = {
  locale: string;
  slug: string;
};

export function CatalogProductDetail({ locale, slug }: CatalogProductDetailProps) {
  const productQuery = usePublicProduct(slug);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const product = productQuery.data;

  const selectedVariant = useMemo(() => {
    if (!product) {
      return null;
    }

    return (
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      product.variants[0] ??
      null
    );
  }, [product, selectedVariantId]);

  if (productQuery.isPending) {
    return <ProductDetailSkeleton />;
  }

  if (productQuery.isError || !product) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-20 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">Không tìm thấy sản phẩm</h1>

        <Link
          href={`/${locale}/products`}
          className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          Quay lại danh sách
        </Link>
      </main>
    );
  }

  const selectedImage = product.images[selectedImageIndex] ?? product.images[0];

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
      <nav className="mb-7 text-sm text-slate-500">
        <Link href={`/${locale}/products`} className="hover:text-slate-950">
          Sản phẩm
        </Link>

        {product.category ? (
          <>
            <span className="mx-2">/</span>

            <Link
              href={`/${locale}/categories/${product.category.slug}`}
              className="hover:text-slate-950"
            >
              {product.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery
          productName={product.name}
          images={product.images}
          selectedImage={selectedImage}
          selectedImageIndex={selectedImageIndex}
          onSelectImage={setSelectedImageIndex}
        />

        <section>
          {product.category ? (
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              {product.category.name}
            </p>
          ) : null}

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {product.name}
          </h1>

          {product.shortDescription ? (
            <p className="mt-5 text-base leading-7 text-slate-600">{product.shortDescription}</p>
          ) : null}

          {selectedVariant ? (
            <div className="mt-7">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-semibold text-slate-950">
                  {formatPrice(
                    selectedVariant.priceAmount,

                    selectedVariant.currency,
                  )}
                </span>

                {selectedVariant.compareAtPrice !== null ? (
                  <span className="text-lg text-slate-400 line-through">
                    {formatPrice(
                      selectedVariant.compareAtPrice,

                      selectedVariant.currency,
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-950">Lựa chọn biến thể</h2>

            <div className="mt-3 grid gap-3">
              {product.variants.map((variant) => (
                <VariantOption
                  key={variant.id}
                  variant={variant}
                  selected={selectedVariant?.id === variant.id}
                  onSelect={() => {
                    setSelectedVariantId(variant.id);
                  }}
                />
              ))}
            </div>
          </div>

          {selectedVariant?.attributes && Object.keys(selectedVariant.attributes).length > 0 ? (
            <dl className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {Object.entries(selectedVariant.attributes).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4 px-5 py-3 text-sm">
                  <dt className="font-medium text-slate-500">{key}</dt>

                  <dd className="text-right text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <button
            type="button"
            disabled={!selectedVariant}
            className="mt-8 h-12 w-full rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white disabled:opacity-50"
          >
            Thêm vào giỏ hàng
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            Chức năng giỏ hàng sẽ được triển khai trong Sprint tiếp theo.
          </p>
        </section>
      </div>

      {product.description ? (
        <section className="mt-16 border-t border-slate-200 pt-10">
          <h2 className="text-2xl font-semibold text-slate-950">Mô tả sản phẩm</h2>

          <div className="mt-5 whitespace-pre-wrap text-base leading-8 text-slate-600">
            {product.description}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ProductGallery({
  productName,
  images,
  selectedImage,
  selectedImageIndex,
  onSelectImage,
}: {
  productName: string;
  images: PublicProductImage[];
  selectedImage: PublicProductImage | undefined;
  selectedImageIndex: number;
  onSelectImage: (index: number) => void;
}) {
  return (
    <section>
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-100">
        {selectedImage ? (
          <Image
            src={selectedImage.publicUrl}
            alt={selectedImage.altText ?? productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-400">
            Chưa có hình ảnh
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.map((image, index) => (
            <button
              key={image.id ?? image.publicUrl}
              type="button"
              aria-label={`Xem ảnh ${index + 1}`}
              onClick={() => {
                onSelectImage(index);
              }}
              className={[
                'relative aspect-square overflow-hidden rounded-xl border-2 bg-slate-100',
                selectedImageIndex === index ? 'border-slate-950' : 'border-transparent',
              ].join(' ')}
            >
              <Image
                src={image.publicUrl}
                alt={image.altText ?? productName}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function VariantOption({
  variant,
  selected,
  onSelect,
}: {
  variant: PublicProductVariant;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex items-center justify-between rounded-xl border p-4 text-left transition',
        selected
          ? 'border-slate-950 bg-slate-50 ring-1 ring-slate-950'
          : 'border-slate-300 hover:border-slate-500',
      ].join(' ')}
    >
      <span>
        <span className="block text-sm font-semibold text-slate-950">{variant.name}</span>

        {variant.sku ? (
          <span className="mt-1 block font-mono text-xs text-slate-400">{variant.sku}</span>
        ) : null}
      </span>

      <span className="text-sm font-semibold text-slate-900">
        {formatPrice(variant.priceAmount, variant.currency)}
      </span>
    </button>
  );
}


function ProductDetailSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-3xl bg-slate-200" />

        <div className="space-y-5">
          <div className="h-8 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-12 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </main>
  );
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
