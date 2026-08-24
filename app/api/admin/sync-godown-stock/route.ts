import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Item from "@/models/Item";
import Warehouse from "@/models/Warehouse";

export async function GET() {
  return handleSyncGodown();
}

export async function POST() {
  return handleSyncGodown();
}

async function handleSyncGodown() {
  try {
    await connectToDatabase();

    // 1. Ensure Warehouses exist
    await Warehouse.findOneAndUpdate(
      { code: "GDN-MAIN" },
      {
        name: "Godown",
        code: "GDN-MAIN",
        type: "warehouse",
        city: "Gorakhpur",
        address: "Plot 42, Transport Nagar Central Logistics Godown, Gorakhpur",
        phone: "+91 98390 11223",
        contactPerson: "Rajesh Kumar (Godown Head)",
        email: "godown@valueplus.com",
        status: "active",
      },
      { upsert: true, new: true }
    );

    // 2. Remove any separate duplicated -GDN items
    await Item.deleteMany({ code: /-GDN$/i });

    // 3. For all products in the catalog, set showroomStock and godownStock
    // so every single product shows its Showroom Stock AND Godown Stock in the live stock column
    const items = await Item.find({});
    let updatedCount = 0;
    let totalShowroomStock = 0;
    let totalGodownStock = 0;

    for (const it of items) {
      const stock = it.currentStock ?? it.openingStock ?? 5;
      const showroomQty = it.showroomStock !== undefined && it.showroomStock > 0 ? it.showroomStock : stock;
      const godownQty = it.godownStock !== undefined && it.godownStock > 0 ? it.godownStock : stock;

      it.showroomStock = showroomQty;
      it.godownStock = godownQty;
      it.currentStock = showroomQty; // Current showroom live stock
      await it.save();

      updatedCount++;
      totalShowroomStock += showroomQty;
      totalGodownStock += godownQty;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${updatedCount} products with Showroom & Godown stock!`,
      summary: {
        totalProducts: updatedCount,
        totalShowroomStockUnits: totalShowroomStock,
        totalGodownStockUnits: totalGodownStock,
      }
    });

  } catch (error: any) {
    console.error("Godown stock sync error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
