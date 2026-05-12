import { prisma } from "../../prisma/prisma.service";

export async function listCategories(): Promise<string[]> {
  const categories = await prisma.category.findMany({
    where: {
      products: {
        some: {
          isActive: true
        }
      }
    },
    select: {
      name: true
    },
    orderBy: {
      name: "asc"
    }
  });

  return categories.map((category: { name: string }) => category.name);
}
