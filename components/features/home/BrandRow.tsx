import Image from 'next/image';
import Link from 'next/link';
import type { TMDBBrand } from '@/lib/tmdb/types';
import { cn } from '@/lib/utils';
import HorizontalScroll from './HorizontalScroll';

interface BrandRowProps {
  title: string;
  brands: readonly TMDBBrand[] | TMDBBrand[];
  type: 'studio' | 'network';
  className?: string;
}

export default function BrandRow({ title, brands, type, className }: BrandRowProps) {
  return (
    <section className={cn('w-full min-w-0', className)}>
      <h2 className="mb-4 pl-4 text-lg font-semibold sm:text-xl md:pl-8">{title}</h2>
      <HorizontalScroll className="-my-4 py-4 md:pl-8">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/protected/explore?${type === 'network' ? 'with_networks' : 'with_companies'}=${brand.id}${type === 'network' ? '&type=tv' : ''}`}
            className="flex aspect-video w-[45vw] shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 p-6 md:w-[250px] md:p-8"
          >
            {brand.logo_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w200${brand.logo_path}`}
                alt={brand.name}
                width={200}
                height={100}
                className="max-h-full max-w-full object-contain opacity-80 contrast-125 grayscale dark:invert"
                unoptimized
              />
            ) : (
              <span className="text-sm font-semibold sm:text-base">{brand.name}</span>
            )}
          </Link>
        ))}
      </HorizontalScroll>
    </section>
  );
}
