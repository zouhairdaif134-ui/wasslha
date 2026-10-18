import type { IconName } from "../components/ui";

const CATEGORY_ICON: Record<string, IconName> = {
  "fruits-legumes": "carrot",
  restaurants: "silverware-fork-knife",
  epicerie: "basket-outline",
  boulangerie: "bread-slice-outline",
  viandes: "food-steak",
  boissons: "bottle-soda-outline",
  magasins: "storefront-outline",
};
export const categoryIcon = (slug?: string): IconName => CATEGORY_ICON[slug ?? ""] ?? "tag-outline";
