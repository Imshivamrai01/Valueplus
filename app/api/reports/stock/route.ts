import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Item from "@/models/Item";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category"); // specific category or "all"
    const warehouse = searchParams.get("warehouse") || searchParams.get("location");
    
    await connectToDatabase();
    
    let allItems = await Item.find({ status: "active" }).lean();

    // Only enforce per-warehouse isolation once items are actually tagged with a warehouse
    // at creation time. Until then, every item has warehouse === undefined, so the strict
    // branch below would zero out stock for every location except the Ashoka default.
    const hasWarehouseTagging = allItems.some((it: any) => it.warehouse);

    if (warehouse && warehouse !== "all" && hasWarehouseTagging) {
      const isAshoka = warehouse.toLowerCase().includes("ashoka") || warehouse.toLowerCase().includes("kunraghat") || warehouse === "VP-KUN";
      if (!isAshoka) {
        allItems = allItems.filter((it: any) =>
          it.warehouse?.toLowerCase() === warehouse.toLowerCase()
        );
      } else {
        allItems = allItems.filter((it: any) =>
          !it.warehouse ||
          it.warehouse.toLowerCase().includes("ashoka") ||
          it.warehouse.toLowerCase().includes("kunraghat")
        );
      }
    }
    
    // Calculate category map dynamically
    const categoryMap: Record<string, { name: string; quantity: number; value: number; itemCount: number }> = {};
    let totalQty = 0;
    let totalVal = 0;

    for (const item of allItems) {
      const catName = item.category?.trim() || "General Electronics";
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, quantity: 0, value: 0, itemCount: 0 };
      }
      const qty = item.currentStock || 0;
      const price = item.sellingPrice || item.purchasePrice || 0;
      const itemVal = qty * price;

      categoryMap[catName].quantity += qty;
      categoryMap[catName].value += itemVal;
      categoryMap[catName].itemCount += 1;

      totalQty += qty;
      totalVal += itemVal;
    }

    const categoriesList = Object.values(categoryMap).sort((a, b) => b.value - a.value);

    // Electronics & Mobile specifically
    const electronicsItems = allItems.filter(
      (item) =>
        item.category?.toLowerCase().includes("elect") ||
        item.category?.toLowerCase().includes("tv") ||
        item.category?.toLowerCase().includes("appl") ||
        item.category?.toLowerCase().includes("ac") ||
        item.category?.toLowerCase().includes("led") ||
        (!item.category?.toLowerCase().includes("mob") && !item.category?.toLowerCase().includes("phone"))
    );
    
    const mobileItems = allItems.filter(
      (item) =>
        item.category?.toLowerCase().includes("mob") ||
        item.category?.toLowerCase().includes("phone") ||
        item.category?.toLowerCase().includes("smart")
    );

    const electronicsTotalQty = electronicsItems.reduce((acc, it) => acc + (it.currentStock || 0), 0);
    const electronicsStockValue = electronicsItems.reduce((acc, it) => acc + (it.currentStock || 0) * (it.sellingPrice || 0), 0);
    
    const mobileTotalQty = mobileItems.reduce((acc, it) => acc + (it.currentStock || 0), 0);
    const mobileStockValue = mobileItems.reduce((acc, it) => acc + (it.currentStock || 0) * (it.sellingPrice || 0), 0);

    const formatItemList = (items: any[]) =>
      items.map((it) => ({
        _id: it._id,
        code: it.code,
        vpCode: it.vpCode || it.code,
        name: it.name,
        category: it.category || "General",
        brand: it.brand || "Brand",
        availableQty: it.currentStock,
        totalQty: it.currentStock,
        sellingPrice: it.sellingPrice,
        purchasePrice: it.purchasePrice,
        stockValue: (it.currentStock || 0) * (it.sellingPrice || 0),
        isSerialized: it.isSerialized || false,
      }));
    
    let filteredItems = allItems;
    if (category && category !== "all") {
      filteredItems = allItems.filter(it => (it.category || "").toLowerCase() === category.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      data: {
        totalQuantity: totalQty,
        totalStockValue: totalVal,
        totalItemsCount: allItems.length,
        electronics: {
          quantity: electronicsTotalQty,
          value: electronicsStockValue,
          count: electronicsItems.length,
        },
        mobile: {
          quantity: mobileTotalQty,
          value: mobileStockValue,
          count: mobileItems.length,
        },
        categories: categoriesList,
      },
      categories: categoriesList,
      items: formatItemList(filteredItems),
      totalStockQuantity: totalQty,
      totalStockValue: totalVal,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
