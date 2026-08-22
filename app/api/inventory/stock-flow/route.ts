import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Item from "@/models/Item";
import PurchaseEntry from "@/models/PurchaseEntry";
import Invoice from "@/models/Invoice";
import StockTransfer from "@/models/StockTransfer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const brand = searchParams.get("brand") || "";
    const category = searchParams.get("category") || "";
    const warehouse = searchParams.get("warehouse") || "";
    const stockStatus = searchParams.get("status") || "all";

    await connectToDatabase();

    // 1. Fetch Items with Warehouse Isolation
    const filter: any = {};
    if (brand && brand !== "all") filter.brand = brand;
    if (category && category !== "all") filter.category = category;
    
    if (warehouse && warehouse !== "all") {
      const isAshoka = warehouse.toLowerCase().includes("ashoka") || warehouse.toLowerCase().includes("kunraghat") || warehouse === "VP-KUN";
      if (!isAshoka) {
        filter.warehouse = { $regex: new RegExp(`^${warehouse.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") };
      } else {
        filter.$or = [
          { warehouse: { $exists: false } },
          { warehouse: "" },
          { warehouse: { $regex: /ashoka|kunraghat/i } }
        ];
      }
    }

    const items = await Item.find(filter).sort({ currentStock: -1, name: 1 }).lean();

    // 2. Fetch all related transactions concurrently
    const [purchaseEntries, invoices, stockTransfers] = await Promise.all([
      PurchaseEntry.find({}).sort({ billDate: -1, createdAt: -1 }).lean(),
      Invoice.find({}).sort({ date: -1, createdAt: -1 }).lean(),
      StockTransfer.find({}).sort({ date: -1, createdAt: -1 }).lean(),
    ]);

    // Build lookup maps for fast matching
    const itemFlowList = items.map((item: any) => {
      const itemIdStr = item._id ? item._id.toString() : "";
      const itemCode = (item.code || "").toLowerCase();
      const itemName = (item.name || "").toLowerCase().trim();

      // --- MATCH INWARDS (PURCHASES) ---
      const inwards: any[] = [];
      for (const pe of purchaseEntries) {
        if (Array.isArray(pe.items)) {
          for (const line of pe.items) {
            const lineId = (line.itemId || "").toString();
            const lineName = (line.name || "").toLowerCase().trim();
            if (lineId === itemIdStr || lineName === itemName || (itemName && lineName && (itemName.includes(lineName) || lineName.includes(itemName)))) {
              inwards.push({
                date: pe.billDate || pe.createdAt,
                quantity: Number(line.quantity) || 1,
                rate: Number(line.rate) || item.purchasePrice || 0,
                billNo: pe.billNo,
                supplierName: pe.supplierName || "Direct Supplier",
                type: "INWARD",
              });
            }
          }
        }
      }

      // --- MATCH OUTWARDS (SALES INVOICES) ---
      const outwards: any[] = [];
      for (const inv of invoices) {
        if (Array.isArray(inv.items)) {
          for (const line of inv.items) {
            const lineId = (line.itemId || "").toString();
            const lineCode = (line.itemCode || "").toLowerCase();
            const lineName = (line.itemName || "").toLowerCase().trim();
            if (lineId === itemIdStr || lineCode === itemCode || lineName === itemName || (itemName && lineName && (itemName.includes(lineName) || lineName.includes(itemName)))) {
              outwards.push({
                date: inv.date || inv.createdAt,
                quantity: Number(line.quantity) || 1,
                rate: Number(line.rate) || item.sellingPrice || 0,
                invoiceNo: inv.invoiceNumber,
                customerName: inv.customerName || "Walk-in Customer",
                type: "OUTWARD",
              });
            }
          }
        }
      }

      // --- MATCH WAREHOUSE TRANSFERS ---
      const transfers: any[] = [];
      for (const st of stockTransfers) {
        if (Array.isArray(st.items)) {
          for (const line of st.items) {
            const lineId = (line.itemId || "").toString();
            const lineName = (line.itemName || "").toLowerCase().trim();
            if (lineId === itemIdStr || lineName === itemName || (itemName && lineName && (itemName.includes(lineName) || lineName.includes(itemName)))) {
              transfers.push({
                date: st.date || st.createdAt,
                quantity: Number(line.quantity) || 1,
                fromWarehouse: st.fromWarehouse || "Main Store",
                toWarehouse: st.toWarehouse || "Branch Store",
                transferNo: st.transferNo,
                status: st.status || "completed",
                type: "TRANSFER",
              });
            }
          }
        }
      }

      // Latest Inward
      const lastInward = inwards.length > 0 ? inwards[0] : (item.openingStock > 0 ? {
        date: "Opening Stock",
        quantity: item.openingStock,
        rate: item.purchasePrice,
        billNo: "INITIAL-STOCK",
        supplierName: "Ashoka Enterprises Opening",
      } : null);

      // Latest Outward
      const lastOutward = outwards.length > 0 ? outwards[0] : null;

      // Latest Transfer
      const lastTransfer = transfers.length > 0 ? transfers[0] : null;

      // Combined Chronological Timeline
      const timeline = [
        ...inwards.map((inw) => ({
          type: "INWARD",
          title: `Stock In (${inw.billNo})`,
          badge: `+${inw.quantity} ${item.unit || "Pcs"}`,
          date: inw.date,
          rate: inw.rate,
          refNo: inw.billNo,
          partyName: inw.supplierName,
          warehouse: item.warehouse || "Main Store - Gorakhpur",
        })),
        ...outwards.map((out) => ({
          type: "OUTWARD",
          title: `Stock Out (${out.invoiceNo})`,
          badge: `-${out.quantity} ${item.unit || "Pcs"}`,
          date: out.date,
          rate: out.rate,
          refNo: out.invoiceNo,
          partyName: out.customerName,
          warehouse: item.warehouse || "Showroom",
        })),
        ...transfers.map((tr) => ({
          type: "TRANSFER",
          title: `Warehouse Transfer (${tr.transferNo})`,
          badge: `${tr.quantity} ${item.unit || "Pcs"} (${tr.fromWarehouse} ➔ ${tr.toWarehouse})`,
          date: tr.date,
          refNo: tr.transferNo,
          partyName: `${tr.fromWarehouse} to ${tr.toWarehouse}`,
          status: tr.status,
          warehouse: tr.toWarehouse,
        })),
      ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

      if (timeline.length === 0 && item.openingStock > 0) {
        timeline.push({
          type: "INWARD",
          title: "Opening Stock Register",
          badge: `+${item.openingStock} ${item.unit || "Pcs"}`,
          date: "Opening Balance",
          rate: item.purchasePrice,
          refNo: "INIT-001",
          partyName: "Opening Stock Register",
          warehouse: item.warehouse || "Main Store",
        });
      }

      return {
        _id: item._id,
        code: item.code,
        vpCode: item.vpCode || item.code,
        name: item.name,
        brand: item.brand || "General",
        category: item.category || "Appliances",
        currentStock: Number(item.currentStock) || 0,
        openingStock: Number(item.openingStock) || 0,
        reorderLevel: Number(item.reorderLevel) || 3,
        purchasePrice: Number(item.purchasePrice) || 0,
        sellingPrice: Number(item.sellingPrice) || 0,
        mrp: Number(item.mrp) || 0,
        unit: item.unit || "Pcs",
        hsnCode: item.hsnCode || "8528",
        warehouse: item.warehouse || "Main Store - Gorakhpur",
        lastInward,
        lastOutward,
        lastTransfer,
        totalInwardQty: inwards.reduce((acc, x) => acc + x.quantity, 0) + (item.openingStock || 0),
        totalOutwardQty: outwards.reduce((acc, x) => acc + x.quantity, 0),
        timeline,
      };
    });

    // Filtering by search & stockStatus if provided
    let filteredResults = itemFlowList;
    if (search) {
      const q = search.toLowerCase();
      filteredResults = filteredResults.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.vpCode && i.vpCode.toLowerCase().includes(q)) ||
          i.brand.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    if (stockStatus === "in-stock") {
      filteredResults = filteredResults.filter((i) => i.currentStock > i.reorderLevel);
    } else if (stockStatus === "low-stock") {
      filteredResults = filteredResults.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderLevel);
    } else if (stockStatus === "out-of-stock") {
      filteredResults = filteredResults.filter((i) => i.currentStock === 0);
    } else if (stockStatus === "recent-inward") {
      filteredResults = filteredResults.filter((i) => !!i.lastInward);
    }

    // High Level Summary Metrics
    const totalSKUs = itemFlowList.length;
    const totalCurrentStock = itemFlowList.reduce((acc, i) => acc + i.currentStock, 0);
    const totalStockValuation = itemFlowList.reduce((acc, i) => acc + i.currentStock * i.purchasePrice, 0);
    const totalInwardUnits = itemFlowList.reduce((acc, i) => acc + i.totalInwardQty, 0);
    const totalOutwardUnits = itemFlowList.reduce((acc, i) => acc + i.totalOutwardQty, 0);
    const totalTransfers = stockTransfers.length;

    return NextResponse.json({
      success: true,
      summary: {
        totalSKUs,
        totalCurrentStock,
        totalStockValuation: Math.round(totalStockValuation),
        totalInwardUnits,
        totalOutwardUnits,
        totalTransfers,
      },
      data: filteredResults,
    });
  } catch (error: any) {
    console.error("Stock flow fetch error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to load stock flow" }, { status: 500 });
  }
}
