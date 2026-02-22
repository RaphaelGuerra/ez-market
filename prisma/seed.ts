import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const staples = [
  { name: "Whole Milk", category: "Dairy", unit: "gallon", brand: "Any" },
  { name: "Eggs", category: "Dairy", unit: "dozen", brand: "Any" },
  { name: "White Bread", category: "Bakery", unit: "loaf", brand: "Any" },
  { name: "Banana", category: "Produce", unit: "lb", brand: "Any" },
  { name: "Chicken Breast", category: "Meat", unit: "lb", brand: "Any" },
  { name: "Rice", category: "Pantry", unit: "lb", brand: "Any" },
  { name: "Olive Oil", category: "Pantry", unit: "bottle", brand: "Any" },
  { name: "Tomato", category: "Produce", unit: "lb", brand: "Any" },
  { name: "Pasta", category: "Pantry", unit: "box", brand: "Any" },
  { name: "Coffee", category: "Beverages", unit: "bag", brand: "Any" }
];

async function main() {
  for (const item of staples) {
    await prisma.catalogItem.upsert({
      where: { id: `seed-${item.name.toLowerCase().replace(/\s+/g, "-")}` },
      create: {
        id: `seed-${item.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: item.name,
        brand: item.brand,
        category: item.category,
        unit: item.unit,
        normalizedName: item.name.toLowerCase()
      },
      update: {}
    });
  }

  for (const market of ["market_api", "market_scrape", "market_partner"]) {
    await prisma.connectorPolicy.upsert({
      where: { market },
      create: {
        market,
        enabled: true,
        mode: market === "market_scrape" ? "SCRAPE_FALLBACK" : "API",
        robotsCompliant: true,
        tosCompliant: true,
        killSwitchEnabled: false
      },
      update: {}
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
