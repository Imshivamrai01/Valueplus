import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Invoice from "@/models/Invoice";
import Item from "@/models/Item";
import PurchaseEntry from "@/models/PurchaseEntry";
import SerialNumber from "@/models/SerialNumber";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    const code = searchParams.get("code") || "";
    const vpCode = searchParams.get("vpCode") || "";
    const name = searchParams.get("name") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!id && !code && !vpCode && !name) {
      return NextResponse.json({ success: false, error: "Product identifier is required" }, { status: 400 });
    }

    // 1. Find the Item
    let itemQuery: any = {};
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      itemQuery._id = id;
    } else if (code) {
      itemQuery.code = code;
    } else if (vpCode) {
      itemQuery.vpCode = vpCode;
    } else if (name) {
      itemQuery.name = { $regex: new RegExp(`^${name.trim()}$`, "i") };
    }

    const item = await Item.findOne(itemQuery).lean();
    const itemCode = item?.code || code;
    const itemVpCode = item?.vpCode || vpCode;
    const itemName = item?.name || name;
    const purchaseCost = Number(item?.purchasePrice || item?.purchaseRate || 0);

    // 2. Fetch Invoices containing this product
    const invoiceQuery: any = {
      status: { $nin: ["cancelled", "draft"] }
    };
    if (startDate && endDate) {
      invoiceQuery.date = { $gte: startDate, $lte: endDate };
    }

    const invoices = await Invoice.find(invoiceQuery).sort({ date: -1, createdAt: -1 }).lean();

    // 3. Fetch Purchase Entries containing this product
    const purchaseQuery: any = {};
    if (startDate && endDate) {
      purchaseQuery.billDate = { $gte: startDate, $lte: endDate };
    }
    const purchases = await PurchaseEntry.find(purchaseQuery).sort({ billDate: -1, createdAt: -1 }).lean();

    // 4. Fetch Serial Numbers for this product
    const serials = await SerialNumber.find({
      $or: [
        { vpCode: itemVpCode },
        { vpCode: itemCode },
        { itemId: item?._id ? String(item._id) : "NO_MATCH" },
        { itemName: { $regex: new RegExp(`^${itemName.trim()}$`, "i") } }
      ]
    }).lean();

    const transactions: any[] = [];
    let totalInwardQty = 0;
    let totalInwardAmount = 0;
    let totalSoldQty = 0;
    let totalSoldRevenue = 0;
    let totalProfit = 0;

    // Process Purchases (Inwards)
    for (const pur of purchases) {
      const items = Array.isArray(pur.items) ? pur.items : [];
      for (const line of items) {
        const matches =
          (line.itemId && (line.itemId === String(item?._id) || line.itemId === itemCode || line.itemId === itemVpCode)) ||
          (line.name && line.name.toLowerCase().trim() === itemName.toLowerCase().trim());

        if (matches) {
          const qty = Number(line.quantity) || 1;
          const rate = Number(line.rate) || purchaseCost;
          const amount = rate * qty;

          totalInwardQty += qty;
          totalInwardAmount += amount;

          transactions.push({
            id: `PUR-${pur._id}-${line.itemId || line.name}`,
            date: pur.billDate || (pur.createdAt ? new Date(pur.createdAt).toISOString().split("T")[0] : "2026-08-24"),
            type: pur.type === "debit-note" ? "PURCHASE_RETURN" : "PURCHASE_INWARD",
            refNo: pur.billNo || "BILL",
            party: pur.supplierName || "Authorized Supplier",
            qtyIn: pur.type === "debit-note" ? 0 : qty,
            qtyOut: pur.type === "debit-note" ? qty : 0,
            rate: rate,
            costRate: rate,
            amount: amount,
            profit: 0,
            serials: line.serialNumbers || [],
            source: "purchase",
            status: pur.status || "completed"
          });
        }
      }
    }

    // Process Invoices (Sales Outwards)
    for (const inv of invoices) {
      const items = Array.isArray(inv.items) ? inv.items : [];
      for (const line of items) {
        const matches =
          (line.itemId && (line.itemId === String(item?._id) || line.itemId === itemCode || line.itemId === itemVpCode)) ||
          (line.itemCode && (line.itemCode === itemCode || line.itemCode === itemVpCode)) ||
          (line.vpCode && (line.vpCode === itemVpCode || line.vpCode === itemCode)) ||
          (line.itemName && line.itemName.toLowerCase().trim() === itemName.toLowerCase().trim());

        if (matches) {
          const qty = Number(line.quantity) || 1;
          const sellingRate = Number(line.rate) || (Number(line.taxableAmount || line.amount) / qty);
          const revenue = Number(line.taxableAmount || line.amount) || (sellingRate * qty);
          const cost = purchaseCost * qty;
          const profit = revenue - cost;

          totalSoldQty += qty;
          totalSoldRevenue += revenue;
          totalProfit += profit;

          transactions.push({
            id: `INV-${inv._id}-${line.itemCode || line.itemName}`,
            date: inv.date || (inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : "2026-08-24"),
            type: "SALE_INVOICE",
            refNo: inv.invoiceNumber || "INV",
            party: inv.customerName || "Retail Walk-in Customer",
            customerPhone: inv.customerPhone || "-",
            paymentMode: inv.paymentMode || inv.paymentMethod || "Mixed",
            qtyIn: 0,
            qtyOut: qty,
            rate: Math.round(sellingRate),
            costRate: purchaseCost,
            amount: Math.round(revenue),
            profit: Math.round(profit),
            marginPct: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
            serials: line.serialNumber ? [line.serialNumber] : [],
            source: "sales",
            status: inv.status || "paid"
          });
        }
      }
    }

    // Sort transactions chronologically (Newest first)
    transactions.sort((a, b) => b.date.localeCompare(a.date));

    const currentStock = (Number(item?.showroomStock ?? item?.currentStock ?? 0) + Number(item?.godownStock ?? 0));
    const avgSellingPrice = totalSoldQty > 0 ? Math.round(totalSoldRevenue / totalSoldQty) : Number(item?.sellingPrice || 0);
    const grossMarginPct = totalSoldRevenue > 0 ? Number(((totalProfit / totalSoldRevenue) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: item?._id || id,
          name: itemName,
          code: itemCode,
          vpCode: itemVpCode,
          brand: item?.brand || "Value Plus",
          category: item?.category || "Electronics",
          unit: item?.unit || "PCS",
          purchasePrice: purchaseCost,
          sellingPrice: Number(item?.sellingPrice || 0),
          mrp: Number(item?.mrp || 0),
          showroomStock: Number(item?.showroomStock ?? item?.currentStock ?? 0),
          godownStock: Number(item?.godownStock ?? 0),
          currentStock,
        },
        summary: {
          totalInwardQty,
          totalInwardAmount: Math.round(totalInwardAmount),
          totalSoldQty,
          totalSoldRevenue: Math.round(totalSoldRevenue),
          totalProfit: Math.round(totalProfit),
          avgPurchaseRate: purchaseCost,
          avgSellingRate: avgSellingPrice,
          grossMarginPct,
        },
        transactions,
        serials: serials.map(s => ({
          serialNumber: s.serialNumber,
          status: s.status || "AVAILABLE",
          warehouse: s.warehouse || "Showroom",
          batchNo: s.batchNo || "-",
          updatedAt: s.updatedAt || s.createdAt
        })),
      }
    });
  } catch (error: any) {
    console.error("Product Ledger API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
