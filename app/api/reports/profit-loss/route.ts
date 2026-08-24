import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Invoice from "@/models/Invoice";
import Item from "@/models/Item";
import Expense from "@/models/Expense";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const branch = searchParams.get("branch");

    // Build Invoice filter
    const invoiceQuery: any = {
      status: { $nin: ["cancelled", "draft"] }
    };

    if (startDate && endDate) {
      invoiceQuery.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      invoiceQuery.date = { $gte: startDate };
    } else if (endDate) {
      invoiceQuery.date = { $lte: endDate };
    }

    if (branch && branch !== "ALL") {
      invoiceQuery["branch.name"] = branch;
    }

    // Build Expense filter
    const expenseQuery: any = {};
    if (startDate && endDate) {
      expenseQuery.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      expenseQuery.date = { $gte: startDate };
    } else if (endDate) {
      expenseQuery.date = { $lte: endDate };
    }

    // Fetch data in parallel
    const [invoices, catalogItems, expenses] = await Promise.all([
      Invoice.find(invoiceQuery).lean(),
      Item.find({}).lean(),
      Expense.find(expenseQuery).lean(),
    ]);

    // Create fast lookup maps for catalog items
    const itemById = new Map<string, any>();
    const itemByCode = new Map<string, any>();
    const itemByName = new Map<string, any>();

    for (const it of catalogItems) {
      if (it._id) itemById.set(String(it._id), it);
      if (it.code) itemByCode.set(String(it.code).toUpperCase(), it);
      if (it.vpCode) itemByCode.set(String(it.vpCode).toUpperCase(), it);
      if (it.name) itemByName.set(String(it.name).trim().toLowerCase(), it);
    }

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalTaxCollected = 0;
    let totalDiscountGiven = 0;
    let totalUnitsSold = 0;

    const productMap = new Map<string, any>();
    const categoryMap = new Map<string, { name: string; revenue: number; cost: number; profit: number; qty: number }>();
    const brandMap = new Map<string, { name: string; revenue: number; cost: number; profit: number; qty: number }>();
    const dailyMap = new Map<string, { date: string; revenue: number; cost: number; profit: number; expense: number }>();

    // Process every invoice and line item
    for (const inv of invoices) {
      const invDate = inv.date || (inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : "2026-08-24");
      
      let invRevenue = 0;
      let invCost = 0;

      totalTaxCollected += Number((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0));
      totalDiscountGiven += Number(inv.discount || 0);

      const items = Array.isArray(inv.items) ? inv.items : [];
      for (const line of items) {
        const qty = Math.max(1, Number(line.quantity) || 1);
        totalUnitsSold += qty;

        // Try resolving matched item in catalog to obtain actual purchase price
        let matched = null;
        if (line.itemId && itemById.has(String(line.itemId))) {
          matched = itemById.get(String(line.itemId));
        } else if (line.vpCode && itemByCode.has(String(line.vpCode).toUpperCase())) {
          matched = itemByCode.get(String(line.vpCode).toUpperCase());
        } else if (line.itemCode && itemByCode.has(String(line.itemCode).toUpperCase())) {
          matched = itemByCode.get(String(line.itemCode).toUpperCase());
        } else if (line.itemName && itemByName.has(String(line.itemName).trim().toLowerCase())) {
          matched = itemByName.get(String(line.itemName).trim().toLowerCase());
        }

        const purchaseRate = Number(matched?.purchasePrice || (matched?.sellingPrice ? matched.sellingPrice * 0.80 : 0));
        const lineTaxable = Number(line.taxableAmount) || Number(line.amount) || (Number(line.rate || 0) * qty);
        const lineCost = purchaseRate * qty;
        const lineProfit = lineTaxable - lineCost;

        invRevenue += lineTaxable;
        invCost += lineCost;

        // Aggregate Product metrics
        const prodKey = matched?.code || matched?.vpCode || line.itemCode || line.vpCode || line.itemName || "UNKNOWN";
        const prodName = line.itemName || matched?.name || "Standard Retail Item";
        const category = matched?.category || "General Electronics";
        const brand = matched?.brand || "Value Plus";
        const unit = line.unit || matched?.unit || "PCS";
        const currentStock = (Number(matched?.showroomStock ?? matched?.currentStock ?? 0) + Number(matched?.godownStock ?? 0));

        if (!productMap.has(prodKey)) {
          productMap.set(prodKey, {
            id: prodKey,
            code: matched?.code || line.itemCode || prodKey,
            vpCode: matched?.vpCode || line.vpCode || prodKey,
            name: prodName,
            category,
            brand,
            unit,
            purchasePrice: purchaseRate,
            qtySold: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            currentStock,
          });
        }

        const pData = productMap.get(prodKey);
        pData.qtySold += qty;
        pData.totalRevenue += lineTaxable;
        pData.totalCost += lineCost;
        pData.totalProfit += lineProfit;

        // Aggregate Category metrics
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { name: category, revenue: 0, cost: 0, profit: 0, qty: 0 });
        }
        const cData = categoryMap.get(category)!;
        cData.revenue += lineTaxable;
        cData.cost += lineCost;
        cData.profit += lineProfit;
        cData.qty += qty;

        // Aggregate Brand metrics
        if (!brandMap.has(brand)) {
          brandMap.set(brand, { name: brand, revenue: 0, cost: 0, profit: 0, qty: 0 });
        }
        const bData = brandMap.get(brand)!;
        bData.revenue += lineTaxable;
        bData.cost += lineCost;
        bData.profit += lineProfit;
        bData.qty += qty;
      }

      totalRevenue += invRevenue;
      totalCOGS += invCost;

      // Aggregate Daily trends
      if (!dailyMap.has(invDate)) {
        dailyMap.set(invDate, { date: invDate, revenue: 0, cost: 0, profit: 0, expense: 0 });
      }
      const dData = dailyMap.get(invDate)!;
      dData.revenue += invRevenue;
      dData.cost += invCost;
      dData.profit += (invRevenue - invCost);
    }

    // Process Operating Expenses
    let totalExpenses = 0;
    const expenseCategoryMap = new Map<string, number>();

    for (const exp of expenses) {
      const expAmt = Number(exp.amount) || 0;
      totalExpenses += expAmt;
      const expCat = exp.category || "General Store Expenses";
      expenseCategoryMap.set(expCat, (expenseCategoryMap.get(expCat) || 0) + expAmt);

      const expDate = exp.date || (exp.createdAt ? new Date(exp.createdAt).toISOString().split("T")[0] : "2026-08-24");
      if (!dailyMap.has(expDate)) {
        dailyMap.set(expDate, { date: expDate, revenue: 0, cost: 0, profit: 0, expense: 0 });
      }
      dailyMap.get(expDate)!.expense += expAmt;
    }

    // Finalize Product Array with Margins and Status
    const productBreakdown = Array.from(productMap.values()).map((p) => {
      const avgSellingPrice = p.qtySold > 0 ? Math.round(p.totalRevenue / p.qtySold) : 0;
      const marginPct = p.totalRevenue > 0 ? Number(((p.totalProfit / p.totalRevenue) * 100).toFixed(2)) : 0;
      
      let status: "high" | "healthy" | "low" | "loss" = "healthy";
      if (p.totalProfit < 0) status = "loss";
      else if (marginPct >= 20) status = "high";
      else if (marginPct >= 8) status = "healthy";
      else status = "low";

      return {
        ...p,
        totalRevenue: Math.round(p.totalRevenue),
        totalCost: Math.round(p.totalCost),
        totalProfit: Math.round(p.totalProfit),
        avgSellingPrice,
        marginPct,
        status,
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);

    // Summary calculations
    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPct = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;
    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

    const categoryBreakdown = Array.from(categoryMap.values()).map(c => ({
      ...c,
      revenue: Math.round(c.revenue),
      cost: Math.round(c.cost),
      profit: Math.round(c.profit),
      marginPct: c.revenue > 0 ? Number(((c.profit / c.revenue) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.profit - a.profit);

    const brandBreakdown = Array.from(brandMap.values()).map(b => ({
      ...b,
      revenue: Math.round(b.revenue),
      cost: Math.round(b.cost),
      profit: Math.round(b.profit),
      marginPct: b.revenue > 0 ? Number(((b.profit / b.revenue) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.profit - a.profit);

    const expenseBreakdown = Array.from(expenseCategoryMap.entries()).map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      percentage: totalExpenses > 0 ? Number(((amount / totalExpenses) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.amount - a.amount);

    const timeline = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalCOGS: Math.round(totalCOGS),
          grossProfit: Math.round(grossProfit),
          grossMarginPct,
          totalExpenses: Math.round(totalExpenses),
          netProfit: Math.round(netProfit),
          netMarginPct,
          totalUnitsSold,
          totalInvoices: invoices.length,
          totalTaxCollected: Math.round(totalTaxCollected),
          totalDiscountGiven: Math.round(totalDiscountGiven),
        },
        productBreakdown,
        categoryBreakdown,
        brandBreakdown,
        expenseBreakdown,
        timeline,
      },
    });
  } catch (error: any) {
    console.error("Profit & Loss Report API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
