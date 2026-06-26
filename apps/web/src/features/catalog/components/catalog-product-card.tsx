import Image from 'next/image';
import Link from 'next/link';
import type { PublicProductListItem } from '../types/catalog';
type CatalogProductCardProps = { locale: string; product: PublicProductListItem };
export function CatalogProductCard({ locale, product }: CatalogProductCardProps) {
  const image = product.images[0];
  const variant = product.variants[0];

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      {' '}
      <Link href={`/${locale}/products/${product.slug}`} className="block">
        {' '}
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          {' '}
          {image ? (
            <Image
              src={image.publicUrl}
              alt={image.altText ?? product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              unoptimized={isLocalMinioUrl(image.publicUrl)}
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-slate-400">
              {' '}
              Chưa có hình ảnh{' '}
            </div>
          )}{' '}
        </div>{' '}
        <div className="p-5">
          {' '}
          {product.category ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {' '}
              {product.category.name}{' '}
            </p>
          ) : null}{' '}
          <h2 className="mt-2 line-clamp-2 font-semibold text-slate-950"> {product.name} </h2>{' '}
          {product.shortDescription ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
              {' '}
              {product.shortDescription}{' '}
            </p>
          ) : null}{' '}
          <div className="mt-4">
            {' '}
            {variant ? (
              <div>
                {' '}
                <span className="text-lg font-semibold text-slate-950">
                  {' '}
                  {formatPrice(variant.priceAmount, variant.currency)}{' '}
                </span>{' '}
                {variant.compareAtPrice !== null ? (
                  <span className="ml-2 text-sm text-slate-400 line-through">
                    {' '}
                    {formatPrice(variant.compareAtPrice, variant.currency)}{' '}
                  </span>
                ) : null}{' '}
              </div>
            ) : (
              <span className="text-sm text-slate-500"> Liên hệ </span>
            )}{' '}
          </div>{' '}
        </div>{' '}
      </Link>{' '}
    </article>
  );
}
function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function isLocalMinioUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    return (
      parsedUrl.protocol === 'http:' &&
      parsedUrl.port === '9000' &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}
