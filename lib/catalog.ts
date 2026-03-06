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

export type CatalogProductCard = {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
};

export type CatalogProductDetail = {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
  optionGroups: CatalogOptionGroup[];
};

export async function getCatalogProducts(): Promise<CatalogProductCard[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    basePrice: product.basePrice,
  }));
}

type ProductDetailQueryResult = {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
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

export async function getCatalogProductBySlug(
  slug: string
): Promise<CatalogProductDetail | null> {
  const product = (await prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
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

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    basePrice: product.basePrice,
    optionGroups,
  };
}