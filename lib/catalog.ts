import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CatalogOption = {
  id: number;
  name: string;
  priceDelta: number;
  sort: number;
};

export type CatalogOptionGroup = {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sort: number;
  options: CatalogOption[];
};

export type CatalogProductImage = {
  id: number;
  url: string;
  alt: string;
  focusX: number;
  focusY: number;
  zoom: number;
  sort: number;
  isCover: boolean;
};

export type CatalogProductCard = {
  id: number;
  name: string;
  slug: string;
  productType: ProductType;
  basePrice: number;
  coverImage: CatalogProductImage | null;
};

export type CatalogProductDetail = {
  id: number;
  name: string;
  slug: string;
  productType: ProductType;
  basePrice: number;
  description: string;
  coverImage: CatalogProductImage | null;
  images: CatalogProductImage[];
  optionGroups: CatalogOptionGroup[];
};

function mapCatalogProductImage(image: {
  id: number;
  url: string;
  alt: string;
  focusX: number;
  focusY: number;
  zoom: number;
  sort: number;
  isCover: boolean;
}): CatalogProductImage {
  return {
    id: image.id,
    url: image.url,
    alt: image.alt,
    focusX: image.focusX,
    focusY: image.focusY,
    zoom: image.zoom,
    sort: image.sort,
    isCover: image.isCover,
  };
}

export async function getCatalogProductsByType(
  productType: ProductType
): Promise<CatalogProductCard[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      productType,
    },
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      productType: true,
      basePrice: true,
      images: {
        where: {
          isActive: true,
        },
        orderBy: [{ isCover: "desc" }, { sort: "asc" }, { id: "asc" }],
        take: 1,
        select: {
          id: true,
          url: true,
          alt: true,
          focusX: true,
          focusY: true,
          zoom: true,
          sort: true,
          isCover: true,
        },
      },
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    productType: product.productType,
    basePrice: product.basePrice,
    coverImage: product.images[0] ? mapCatalogProductImage(product.images[0]) : null,
  }));
}

export async function getCatalogProducts(): Promise<CatalogProductCard[]> {
  return getCatalogProductsByType(ProductType.CAKE);
}

type ProductDetailQueryResult = {
  id: number;
  name: string;
  slug: string;
  productType: ProductType;
  basePrice: number;
  description: string;
  images: {
    id: number;
    url: string;
    alt: string;
    focusX: number;
    focusY: number;
    zoom: number;
    sort: number;
    isCover: boolean;
  }[];
  optionGroups: {
    id: number;
    sort: number;
    optionGroup: {
      id: number;
      name: string;
      required: boolean;
      minSelect: number;
      maxSelect: number;
      sort: number;
      isActive: boolean;
      options: {
        id: number;
        name: string;
        priceDelta: number;
        sort: number;
        isActive: boolean;
      }[];
    };
  }[];
};

export async function getCatalogProductBySlugAndType(
  slug: string,
  productType: ProductType
): Promise<CatalogProductDetail | null> {
  const product = (await prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
      productType,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      productType: true,
      basePrice: true,
      description: true,
      images: {
        where: {
          isActive: true,
        },
        orderBy: [{ isCover: "desc" }, { sort: "asc" }, { id: "asc" }],
        select: {
          id: true,
          url: true,
          alt: true,
          focusX: true,
          focusY: true,
          zoom: true,
          sort: true,
          isCover: true,
        },
      },
      optionGroups: {
        orderBy: [{ sort: "asc" }, { id: "asc" }],
        select: {
          id: true,
          sort: true,
          optionGroup: {
            select: {
              id: true,
              name: true,
              required: true,
              minSelect: true,
              maxSelect: true,
              sort: true,
              isActive: true,
              options: {
                where: {
                  isActive: true,
                },
                orderBy: [{ sort: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  name: true,
                  priceDelta: true,
                  sort: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  })) as ProductDetailQueryResult | null;

  if (!product) {
    return null;
  }

  const optionGroups: CatalogOptionGroup[] = product.optionGroups
    .map((binding) => ({
      bindingSort: binding.sort,
      group: binding.optionGroup,
    }))
    .filter(({ group }) => group.isActive)
    .sort((a, b) => a.bindingSort - b.bindingSort || a.group.id - b.group.id)
    .map(({ group }) => ({
      id: group.id,
      name: group.name,
      required: group.required,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      sort: group.sort,
      options: group.options
        .filter((option) => option.isActive)
        .sort((a, b) => a.sort - b.sort || a.id - b.id)
        .map((option) => ({
          id: option.id,
          name: option.name,
          priceDelta: option.priceDelta,
          sort: option.sort,
        })),
    }));

  const images = product.images.map(mapCatalogProductImage);
  const coverImage = images.find((image) => image.isCover) ?? images[0] ?? null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    productType: product.productType,
    basePrice: product.basePrice,
    description: product.description ?? "",
    coverImage,
    images,
    optionGroups,
  };
}

export async function getCatalogProductBySlug(
  slug: string
): Promise<CatalogProductDetail | null> {
  return getCatalogProductBySlugAndType(slug, ProductType.CAKE);
}