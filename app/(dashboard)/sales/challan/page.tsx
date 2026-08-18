"use client";

/**
 * VALUEPLUS ERP — Delivery & Return Challan (With Printable Challan Sheet & Premium Landscape Form)
 */

import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Plus, Search, Truck, ArrowLeftRight, PackageCheck, Printer, Download, Eye, RotateCcw, 
  Building, Sparkles, FileText, CheckCircle2, ShieldCheck, FileCheck, ArrowRight, UserCheck, PhoneCall, X, MessageCircle
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { formatDate, cn } from "@/lib/utils";
import { DateRangeFilter, resolveDateRange, isDateInRange } from "@/components/shared/date-range-filter";
import { toast } from "sonner";


interface ChallanItem {
  id: string;
  challanNo: string;
  type: "Customer Return" | "Warehouse Return" | "Supplier Return" | "Client Return";
  sourceParty: string;
  sourceAddress: string;
  destinationParty: string;
  destinationAddress: string;
  itemName: string;
  hsn: string;
  serialImei: string;
  quantity: number;
  unit: string;
  reason: string;
  date: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  status: "dispatched" | "in-transit" | "returned" | "received";
}

const INITIAL_CHALLANS: ChallanItem[] = [
  {
    id: "1",
    challanNo: "DC-2026-0089",
    type: "Customer Return",
    sourceParty: "Sharma Enterprises Pvt Ltd",
    sourceAddress: "18, Nehru Market, Civil Lines, Prayagraj, UP – 211001",
    destinationParty: "VALUEPLUS Head Warehouse",
    destinationAddress: "B-42, Sector 63, Noida Industrial Area, UP – 201301",
    itemName: "iPhone 15 Pro Max 256GB (Defective Unit)",
    hsn: "8517",
    serialImei: "IMEI 359182049182341",
    quantity: 1,
    unit: "PCS",
    reason: "Display flickering - Warranty Claim Return",
    date: "2026-08-02",
    vehicleNo: "UP-70-AT-4921",
    driverName: "Rakesh Kumar",
    driverPhone: "+91 98765 12345",
    status: "in-transit",
  },
  {
    id: "2",
    challanNo: "DC-2026-0088",
    type: "Warehouse Return",
    sourceParty: "Pune Branch Store",
    sourceAddress: "Survey No. 89, Hinjewadi Phase 2, Pune, MH – 411057",
    destinationParty: "VALUEPLUS Main Store",
    destinationAddress: "Plot 45, MIDC Andheri East, Mumbai, MH – 400093",
    itemName: "Sony Bravia 55\" Smart LED TV",
    hsn: "8528",
    serialImei: "SN SNY55-891024",
    quantity: 2,
    unit: "PCS",
    reason: "Excess stock transfer back to Main Store",
    date: "2026-08-01",
    vehicleNo: "MH-12-PQ-8812",
    driverName: "Suresh Patil",
    driverPhone: "+91 98123 45678",
    status: "returned",
  },
  {
    id: "3",
    challanNo: "DC-2026-0087",
    type: "Supplier Return",
    sourceParty: "VALUEPLUS Store (Delhi)",
    sourceAddress: "Sector 63, Noida, UP – 201301",
    destinationParty: "Apple Authorized Service Base",
    destinationAddress: "Connaught Place, New Delhi – 110001",
    itemName: "AirPods Pro (2nd Gen) USB-C",
    hsn: "8518",
    serialImei: "SN AAP-9018241",
    quantity: 5,
    unit: "PR",
    reason: "Factory defect return to brand manufacturer",
    date: "2026-07-30",
    vehicleNo: "DL-1C-XY-3012",
    driverName: "Amit Singh",
    driverPhone: "+91 98012 34567",
    status: "received",
  },
  {
    id: "4",
    challanNo: "DC-2026-0086",
    type: "Client Return",
    sourceParty: "Patel Industries",
    sourceAddress: "Plot 12, GIDC Naroda, Ahmedabad, GJ – 382330",
    destinationParty: "VALUEPLUS Central Hub",
    destinationAddress: "MIDC Industrial Area, Mumbai, MH – 400093",
    itemName: "MacBook Air M3 16GB/512GB",
    hsn: "8471",
    serialImei: "SN C02G8912MD6",
    quantity: 1,
    unit: "PCS",
    reason: "Wrong SKU dispatched - Replacement Return",
    date: "2026-07-28",
    vehicleNo: "GJ-01-AB-1902",
    driverName: "Vikram Shah",
    driverPhone: "+91 98901 23456",
    status: "dispatched",
  },
];

const STATUS_MAP = {
  dispatched: { label: "Dispatched", variant: "warning" as const },
  "in-transit": { label: "In-Transit", variant: "info" as const },
  returned: { label: "Returned to Base", variant: "success" as const },
  received: { label: "Received & Closed", variant: "success" as const },
};

export default function DeliveryChallanPage() {
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("This Month");
  const [dateRange, setDateRange] = useState(() => resolveDateRange("This Month"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<any | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  
  const [items, setItems] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [showBillSuggestions, setShowBillSuggestions] = useState(false);
  const [billSearchQuery, setBillSearchQuery] = useState("");

  const fetchChallans = async () => {
    try {
      const res = await fetch("/api/delivery-challans");
      const json = await res.json();
      if (json.success) setChallans(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      if (json.success) setInvoices(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (json.success) setSuppliers(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchChallans();
    fetchItems();
    fetchInvoices();
    fetchCustomers();
    fetchSuppliers();
  }, []);

  const [formData, setFormData] = useState({
    type: "Customer Return",
    invoiceNumber: "",
    sourceParty: "",
    sourcePhone: "",
    sourceAddress: "",
    destinationParty: "VALUEPLUS Head Warehouse (Gorakhpur)",
    destinationAddress: "H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR",
    itemName: "",
    vpCode: "",
    hsn: "8517",
    serialImei: "",
    quantity: "1",
    unit: "PCS",
    reason: "Defective Warranty Return",
    vehicleNo: "",
    driverName: "",
    driverPhone: "",
  });

  // Calculate past purchased/billed products for the currently entered party
  const partyPurchasedItems = useMemo(() => {
    if (!formData.sourceParty && !formData.sourcePhone && !formData.invoiceNumber) return [];

    const matchedInvoices = invoices.filter((inv: any) => {
      if (formData.invoiceNumber && inv.invoiceNumber?.toLowerCase() === formData.invoiceNumber.toLowerCase()) return true;
      if (formData.sourcePhone && inv.customerPhone && inv.customerPhone.replace(/\D/g, '') === formData.sourcePhone.replace(/\D/g, '')) return true;
      if (formData.sourceParty && inv.customerName && inv.customerName.toLowerCase().includes(formData.sourceParty.toLowerCase())) return true;
      return false;
    });

    const products: any[] = [];
    matchedInvoices.forEach((inv: any) => {
      (inv.items || []).forEach((it: any, itIdx: number) => {
        products.push({
          uniqueId: `${inv.invoiceNumber}-${itIdx}`,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.date || inv.createdAt,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          customerAddress: inv.customerAddress || inv.placeOfSupply || "",
          itemName: it.itemName || it.name,
          vpCode: it.vpCode || it.itemCode || "",
          itemCode: it.itemCode || "",
          hsn: it.hsnCode || it.hsn || "8517",
          serialImei: it.serialNumber || it.serialImei || it.batchNumber || "",
          quantity: it.quantity || it.qty || 1,
          unit: it.unit || "PCS",
          rate: it.rate || it.price || 0,
          amount: it.amount || it.total || 0,
          warrantyPlan: it.extendedWarrantyPlan || "",
        });
      });
    });

    return products;
  }, [invoices, formData.sourceParty, formData.sourcePhone, formData.invoiceNumber]);

  // Handle selecting a purchased product from the party's history
  const handleSelectPurchasedProduct = (prod: any) => {
    setFormData((prev) => ({
      ...prev,
      invoiceNumber: prod.invoiceNumber || prev.invoiceNumber,
      itemName: prod.itemName,
      vpCode: prod.vpCode,
      hsn: prod.hsn || prev.hsn,
      serialImei: prod.serialImei || prev.serialImei,
      quantity: String(prod.quantity || 1),
      unit: prod.unit || "PCS",
      sourceParty: prod.customerName || prev.sourceParty,
      sourcePhone: (prod.customerPhone || prev.sourcePhone).replace(/\D/g, ''),
      sourceAddress: prod.customerAddress || prev.sourceAddress,
      reason: `Warranty Return / Service Claim for Bill #${prod.invoiceNumber}`,
    }));
    toast.success(`Loaded "${prod.itemName}" from Bill #${prod.invoiceNumber}!`);
  };

  // Handle selecting an invoice from Bill Number search
  const handleSelectInvoice = (inv: any) => {
    setBillSearchQuery(inv.invoiceNumber);
    setFormData((prev) => ({
      ...prev,
      invoiceNumber: inv.invoiceNumber,
      sourceParty: inv.customerName || prev.sourceParty,
      sourcePhone: (inv.customerPhone || prev.sourcePhone || "").replace(/\D/g, ''),
      sourceAddress: inv.customerAddress || inv.placeOfSupply || prev.sourceAddress,
    }));
    setShowBillSuggestions(false);

    if (inv.items && inv.items.length === 1) {
      handleSelectPurchasedProduct({
        ...inv.items[0],
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        customerAddress: inv.customerAddress,
      });
    } else {
      toast.info(`Invoice #${inv.invoiceNumber} loaded. Pick an item from the list below.`);
    }
  };

  const filtered = useMemo(() => {
    return challans.filter((c) => {
      const matchSearch =
        !search ||
        (c.challanNo && c.challanNo.toLowerCase().includes(search.toLowerCase())) ||
        (c.sourceParty && c.sourceParty.toLowerCase().includes(search.toLowerCase())) ||
        (c.itemName && c.itemName.toLowerCase().includes(search.toLowerCase())) ||
        (c.invoiceNumber && c.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
        (c.vpCode && c.vpCode.toLowerCase().includes(search.toLowerCase())) ||
        (c.serialImei && c.serialImei.toLowerCase().includes(search.toLowerCase()));
      const matchType = typeFilter === "all" || c.type === typeFilter;
      const matchDate = isDateInRange(c.date || c.createdAt, dateRange.start, dateRange.end);
      return matchSearch && matchType && matchDate;
    });
  }, [challans, search, typeFilter, dateRange]);

  const handleSave = async () => {
    if (!formData.sourcePhone || formData.sourcePhone.replace(/\D/g, '').length !== 10) {
      toast.error("Please enter a valid 10-digit source party mobile number");
      return;
    }
    if (!formData.sourceParty || !formData.itemName) {
      toast.error("Please fill Source Party and Item details");
      return;
    }

    const payload = {
      ...formData,
      challanNo: `DC-${new Date().getFullYear()}-${String(challans.length + 1).padStart(4, "0")}`,
      quantity: Number(formData.quantity) || 1,
      status: "dispatched",
    };

    try {
      const res = await fetch("/api/delivery-challans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Delivery Challan ${json.data.challanNo} generated!`);
        setIsFormOpen(false);
        fetchChallans();
        setFormData({
          type: "Customer Return",
          invoiceNumber: "",
          sourceParty: "",
          sourcePhone: "",
          sourceAddress: "",
          destinationParty: "VALUEPLUS Head Warehouse (Gorakhpur)",
          destinationAddress: "H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR",
          itemName: "",
          vpCode: "",
          hsn: "8517",
          serialImei: "",
          quantity: "1",
          unit: "PCS",
          reason: "Defective Warranty Return",
          vehicleNo: "",
          driverName: "",
          driverPhone: "",
        });
        setBillSearchQuery("");
      } else {
        toast.error(json.error || "Failed to create delivery challan");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const openPrintSheet = (c: ChallanItem) => {
    setSelectedChallan(c);
    setIsPrintOpen(true);
  };

  return (
    <PageShell
      title="Delivery & Return Challan"
      subtitle="Track goods returned from customers, clients & warehouses back to company base"
      breadcrumbs={[{ label: "Sales" }, { label: "Delivery Challan" }]}
      actions={
        <Button size="sm" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Delivery Challan
        </Button>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#3F63AD]/10 flex items-center justify-center text-[#3F63AD]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{challans.length}</p>
              <p className="text-xs text-muted-foreground">Total Challans</p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{challans.filter((c) => c.status === "in-transit" || c.status === "dispatched").length}</p>
              <p className="text-xs text-muted-foreground">In-Transit Returns</p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{challans.filter((c) => c.status === "returned" || c.status === "received").length}</p>
              <p className="text-xs text-muted-foreground">Returned to Base</p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{challans.filter((c) => c.type === "Customer Return").length}</p>
              <p className="text-xs text-muted-foreground">Customer Returns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="data-table-container">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search Challan #, Customer, Serial/IMEI, Item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Return Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Return Types</SelectItem>
              <SelectItem value="Customer Return">Customer Return</SelectItem>
              <SelectItem value="Warehouse Return">Warehouse Return</SelectItem>
              <SelectItem value="Supplier Return">Supplier Return</SelectItem>
              <SelectItem value="Client Return">Client Return</SelectItem>
            </SelectContent>
          </Select>
          <DateRangeFilter 
            value={dateFilter} 
            onChange={(val, s, e) => {
              setDateFilter(val);
              if (s && e) setDateRange({ start: s, end: e });
            }}
            className="w-40"
            showIcon={true}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Challan #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Return Source → Destination</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Item & Serial / IMEI</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Reason / Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No Delivery Challans found
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c._id || c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#3F63AD] cursor-pointer" onClick={() => openPrintSheet(c)}>
                      {c.challanNo}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{c.sourceParty}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        → <span className="font-medium text-slate-700">{c.destinationParty}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground">{c.itemName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.vpCode && (
                          <span className="text-[10px] font-mono font-bold text-[#3F63AD] bg-blue-50 px-1 rounded">VP: {c.vpCode}</span>
                        )}
                        {c.serialImei && (
                          <span className="text-[10px] font-mono text-slate-500">SN: {c.serialImei}</span>
                        )}
                        {c.invoiceNumber && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">Bill: #{c.invoiceNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {c.quantity} {c.unit}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-foreground">{c.reason}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{c.vehicleNo || "—"} ({c.driverName || "Driver"})</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.date)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_MAP[c.status as keyof typeof STATUS_MAP]?.variant || "secondary"}>{STATUS_MAP[c.status as keyof typeof STATUS_MAP]?.label || c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openPrintSheet(c)} className="h-7 px-2 text-[11px] font-semibold border-[#3F63AD]/40 text-[#3F63AD] hover:bg-[#3F63AD] hover:text-white">
                          <Printer className="w-3 h-3 mr-1" /> Sheet
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                          onClick={() => {
                            const phone = (c.sourcePhone || c.customerPhone || "").replace(/\D/g, "");
                            const ph = phone.length === 10 ? `91${phone}` : phone;
                            const msg = encodeURIComponent(
                              `*VALUE PLUS / ASHOKA ENTERPRISES*\nDelivery & Return Challan #${c.challanNo}\nType: ${c.type}\nItem: ${c.itemName}\nSerial/IMEI: ${c.serialImei || 'N/A'}\nQty: ${c.quantity} ${c.unit}\nDestination: ${c.destinationParty}\nStatus: ${c.status}\n\nThank you!`
                            );
                            window.open(ph ? `https://wa.me/${ph}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
                          }}
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PREMIUM LANDSCAPE ADD DELIVERY CHALLAN MODAL */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl shadow-2xl border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#2C3E5A] to-[#1B2537] text-white p-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Truck className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  New Delivery / Return Challan
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#76C043]/20 text-[#76C043] border border-[#76C043]/30 font-mono font-bold">
                    RETURN DISPATCH NOTE
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  M/S ASHOKA ENTERPRISES / VALUE PLUS • Goods dispatch note for customer returns, warranty claims, or inter-warehouse transport
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5 bg-slate-50/70">
            {/* ─── QUICK LOOKUP BY BILL / INVOICE NUMBER (REQ) ─── */}
            <div className="bg-gradient-to-r from-blue-50/80 via-white to-blue-50/80 p-4 rounded-xl border border-blue-200/80 shadow-sm relative">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Quick Auto-Fill: Search by Bill / Invoice Number
                </Label>
                {formData.invoiceNumber && (
                  <Badge variant="outline" className="text-[10px] font-mono bg-blue-100 text-[#3F63AD] border-blue-300">
                    Linked to: {formData.invoiceNumber}
                  </Badge>
                )}
              </div>
              
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Enter Invoice Number e.g. INV-2026-0001 or Customer Name..."
                    value={billSearchQuery}
                    onChange={(e) => {
                      setBillSearchQuery(e.target.value);
                      setShowBillSuggestions(true);
                    }}
                    onFocus={() => setShowBillSuggestions(true)}
                    className="pl-9 pr-8 bg-white border-blue-300 font-mono text-xs font-bold text-slate-800 shadow-inner"
                  />
                  {billSearchQuery && (
                    <button 
                      onClick={() => { setBillSearchQuery(""); setFormData({ ...formData, invoiceNumber: "" }); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Invoices Dropdown Autocomplete */}
                {showBillSuggestions && invoices.length > 0 && billSearchQuery.trim() && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[220px] flex flex-col">
                    <div className="p-2 bg-slate-100 text-[11px] font-semibold text-slate-600 border-b flex justify-between">
                      <span>Matching Invoices</span>
                      <span>Click to Auto-Fill Challan</span>
                    </div>
                    <div className="overflow-y-auto divide-y divide-slate-100">
                      {invoices
                        .filter((inv: any) => 
                          (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(billSearchQuery.toLowerCase())) ||
                          (inv.customerName && inv.customerName.toLowerCase().includes(billSearchQuery.toLowerCase())) ||
                          (inv.customerPhone && inv.customerPhone.includes(billSearchQuery))
                        )
                        .slice(0, 6)
                        .map((inv: any) => (
                          <div
                            key={inv._id || inv.invoiceNumber}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectInvoice(inv);
                            }}
                            className="p-2.5 hover:bg-blue-50/80 cursor-pointer flex items-center justify-between transition-colors text-xs"
                          >
                            <div>
                              <span className="font-bold text-[#3F63AD] font-mono">{inv.invoiceNumber}</span>
                              <span className="text-slate-700 font-medium ml-2">{inv.customerName}</span>
                              <span className="text-[10px] text-slate-400 block">{inv.customerPhone} · {formatDate(inv.date)}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900">₹{Number(inv.total || 0).toLocaleString("en-IN")}</span>
                              <span className="text-[10px] text-emerald-600 block font-semibold">{inv.items?.length || 0} Items</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── SECTION 1: PARTY PARTICULARS (CUSTOMER / SUPPLIER / WAREHOUSE / CLIENT) ─── */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#3F63AD]" /> 1. Return Origin & Destination Parties
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Return Category *</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 focus:ring-2 focus:ring-[#3F63AD]/20 font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer Return">Customer Return (Warranty/Defect)</SelectItem>
                      <SelectItem value="Warehouse Return">Warehouse Return (Branch to Hub)</SelectItem>
                      <SelectItem value="Supplier Return">Supplier Return (Brand Return)</SelectItem>
                      <SelectItem value="Client Return">Client Return (Exchange/Wrong SKU)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    {formData.type === "Supplier Return" 
                      ? "Supplier Mobile Number *" 
                      : formData.type === "Warehouse Return" 
                      ? "Source Warehouse Mobile *" 
                      : "Customer Mobile Number *"}
                  </Label>
                  <Input
                    type="text"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={formData.sourcePhone}
                    onChange={(e) => setFormData({ ...formData, sourcePhone: e.target.value.replace(/\D/g, '') })}
                    className="bg-slate-50 border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    {formData.type === "Supplier Return" 
                      ? "Supplier Name *" 
                      : formData.type === "Warehouse Return" 
                      ? "Source Warehouse Name *" 
                      : "Customer Name *"}
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder={
                        formData.type === "Supplier Return"
                          ? "e.g. Apple India / Havells"
                          : formData.type === "Warehouse Return"
                          ? "e.g. Noida Hub / Gorakhpur Store"
                          : "e.g. Ajay Tiwari / Mohd Dilshad"
                      }
                      value={formData.sourceParty}
                      onChange={(e) => {
                        setFormData({ ...formData, sourceParty: e.target.value });
                        setShowPartySuggestions(true);
                      }}
                      onFocus={() => setShowPartySuggestions(true)}
                      className="bg-slate-50 border-slate-300 font-bold text-slate-900"
                    />

                    {/* Customer Autocomplete Dropdown */}
                    {showPartySuggestions && formData.sourceParty.trim() && customers.length > 0 && formData.type === "Customer Return" && (
                      <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden max-h-[180px] overflow-y-auto">
                        {customers
                          .filter((c: any) => c.name?.toLowerCase().includes(formData.sourceParty.toLowerCase()) || c.phone?.includes(formData.sourceParty))
                          .slice(0, 5)
                          .map((c: any) => (
                            <div
                              key={c._id || c.name}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setFormData({
                                  ...formData,
                                  sourceParty: c.name,
                                  sourcePhone: (c.phone || "").replace(/\D/g, ''),
                                  sourceAddress: c.address || c.city || "",
                                });
                                setShowPartySuggestions(false);
                              }}
                              className="p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                            >
                              <span className="font-semibold text-slate-800">{c.name}</span>
                              <span className="font-mono text-slate-500 text-[11px]">{c.phone}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs font-semibold text-slate-700">Destination (Returned Back To Company/Base) *</Label>
                  <Input
                    placeholder="e.g. VALUEPLUS Head Warehouse, Gorakhpur"
                    value={formData.destinationParty}
                    onChange={(e) => setFormData({ ...formData, destinationParty: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* ─── SECTION 2: PAST PURCHASED PRODUCTS LIST (REQ: AUTO-LIST PRODUCT PURCHASED BY CUSTOMER/PARTY) ─── */}
            {partyPurchasedItems.length > 0 && (
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    Previously Purchased Products by {formData.sourceParty || "Customer"} ({partyPurchasedItems.length} found)
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-medium">Click on any item to use for Challan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto p-1">
                  {partyPurchasedItems.map((prod: any) => (
                    <div 
                      key={prod.uniqueId}
                      onClick={() => handleSelectPurchasedProduct(prod)}
                      className={cn(
                        "p-3 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between group",
                        formData.serialImei === prod.serialImei && formData.itemName === prod.itemName
                          ? "bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-300"
                          : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-emerald-800">{prod.itemName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {prod.vpCode && (
                              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 bg-slate-50">
                                VP: {prod.vpCode}
                              </Badge>
                            )}
                            {prod.serialImei && (
                              <span className="text-[10px] font-mono font-bold text-blue-700">
                                SN/IMEI: {prod.serialImei}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-100/50 group-hover:bg-emerald-600 group-hover:text-white"
                        >
                          + Select
                        </Button>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Bill: <b className="font-mono text-slate-700">{prod.invoiceNumber}</b> ({formatDate(prod.invoiceDate)})</span>
                        <span className="font-semibold text-slate-800 font-mono">₹{Number(prod.amount || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── SECTION 3: PRODUCT & SERIAL / IMEI PARTICULARS ─── */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#3F63AD]" /> 2. Product & Serial / IMEI Particulars
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-2 relative">
                  <Label className="text-xs font-semibold text-slate-700">Product Name & Model *</Label>
                  <Input
                    placeholder="Type to search products..."
                    value={formData.itemName}
                    onChange={(e) => {
                      setFormData({ ...formData, itemName: e.target.value });
                      setShowItemSuggestions(true);
                    }}
                    onFocus={() => setShowItemSuggestions(true)}
                    className="bg-slate-50 border-slate-300 font-bold text-slate-900"
                  />
                  {showItemSuggestions && items.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden max-h-[220px] flex flex-col">
                      <div className="p-2 bg-slate-100 text-xs font-semibold text-slate-600 border-b">
                        Catalog Items (Select Item)
                      </div>
                      <div className="overflow-y-auto p-1 space-y-1">
                        {items
                          .filter((prod) => prod.name.toLowerCase().includes((formData.itemName || "").toLowerCase()) || (prod.vpCode && prod.vpCode.toLowerCase().includes((formData.itemName || "").toLowerCase())))
                          .map((prod, pIdx) => (
                            <div
                              key={pIdx}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setFormData({
                                  ...formData,
                                  itemName: prod.name,
                                  vpCode: prod.vpCode || prod.code || "",
                                  hsn: prod.hsnCode || "8517"
                                });
                                setShowItemSuggestions(false);
                              }}
                              className="p-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors rounded-md text-xs"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{prod.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">VP Code: {prod.vpCode || prod.code}</span>
                              </div>
                              <span className="text-[10px] font-mono text-[#3F63AD]">HSN: {prod.hsnCode || "8517"}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">VP Code</Label>
                  <Input
                    placeholder="VP-ELEC-001"
                    value={formData.vpCode}
                    onChange={(e) => setFormData({ ...formData, vpCode: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono text-xs font-bold text-[#3F63AD]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">HSN Code</Label>
                  <Input
                    placeholder="8517"
                    value={formData.hsn}
                    onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Serial / IMEI No.</Label>
                  <Input
                    placeholder="IMEI 359182049182341..."
                    value={formData.serialImei}
                    onChange={(e) => setFormData({ ...formData, serialImei: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Quantity</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PCS">PCS</SelectItem>
                      <SelectItem value="BOX">BOX</SelectItem>
                      <SelectItem value="SET">SET</SelectItem>
                      <SelectItem value="PR">PR</SelectItem>
                      <SelectItem value="UNT">UNT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-4">
                  <Label className="text-xs font-semibold text-slate-700">Return Reason / Fault Description</Label>
                  <Input
                    placeholder="Display flickering / Warranty return claim / Excess stock return"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* ─── SECTION 4: TRANSPORT & VEHICLE DETAILS ─── */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#3F63AD]" /> 3. Vehicle & Transport Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Vehicle Reg Number</Label>
                  <Input
                    placeholder="UP-53-AT-4921"
                    value={formData.vehicleNo}
                    onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Driver / Courier Person</Label>
                  <Input
                    placeholder="Driver Name"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Driver Phone Contact</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={formData.driverPhone}
                    onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                    className="bg-slate-50 border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              * Delivery Challan contains no commercial sale value and is issued for return/transit only.
            </span>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} className="px-5">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white px-6 font-bold shadow-lg shadow-[#3F63AD]/25">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Issue Delivery Challan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE DELIVERY CHALLAN INVOICE / SHEET MODAL */}
      <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-none">
          {selectedChallan && (
            <div className="bg-slate-100 p-4">
              {/* TOP ACTION BAR */}
              <div className="flex items-center justify-between bg-white px-6 py-3 rounded-xl shadow-sm mb-4 border no-print">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#76C043]" />
                  <span className="font-bold text-sm text-slate-800">
                    Delivery Challan Sheet — {selectedChallan.challanNo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const phone = (selectedChallan.sourcePhone || selectedChallan.customerPhone || "").replace(/\D/g, "");
                      const ph = phone.length === 10 ? `91${phone}` : phone;
                      const msg = encodeURIComponent(
                        `*VALUE PLUS / ASHOKA ENTERPRISES*\nDelivery & Return Challan #${selectedChallan.challanNo}\nType: ${selectedChallan.type}\nItem: ${selectedChallan.itemName} ${selectedChallan.vpCode ? `(VP: ${selectedChallan.vpCode})` : ''}\nSerial/IMEI: ${selectedChallan.serialImei || 'N/A'}\nQty: ${selectedChallan.quantity} ${selectedChallan.unit}\nDestination: ${selectedChallan.destinationParty}\nStatus: ${selectedChallan.status}\n\nThank you for choosing Value Plus! For support call 9140860604.`
                      );
                      window.open(ph ? `https://wa.me/${ph}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
                    }} 
                    className="gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-600 hover:text-white"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                    <Printer className="w-4 h-4" /> Print
                  </Button>
                  <Button size="sm" onClick={() => window.print()} className="bg-[#3F63AD] text-white gap-1.5">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                </div>
              </div>

              {/* PRINTABLE CHALLAN CONTAINER */}
              <div className="bg-white rounded-xl shadow-xl p-8 max-w-3xl mx-auto border border-slate-200 text-slate-800 relative isolation-isolate overflow-hidden" id="challan-printable-sheet">
                
                {/* WATERMARK */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 -rotate-12 z-0">
                  <span className="text-8xl font-black uppercase tracking-widest text-[#76C043]">RETURN CHALLAN</span>
                </div>

                {/* HEADER WITH SIDEBAR LOGO */}
                <div className="flex justify-between items-start border-b-2 border-[#3F63AD] pb-5 relative z-10">
                  <div className="flex items-center gap-4">
                    {/* VALUEPLUS SIDEBAR BRAND LOGO */}
                    <div className="bg-[#1B2537] px-4 py-2.5 rounded-xl shadow-md flex flex-col items-center justify-center border border-white/10 flex-shrink-0">
                      <div className="flex items-center text-[22px] font-black tracking-tight leading-none">
                        <span className="text-white">VALUE</span>
                        <span className="text-[#76C043]">PLUS</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 opacity-90">
                        <div className="h-[1px] w-3 bg-white/70" />
                        <span className="text-white text-[9.5px] font-medium tracking-wide">रिश्ता विश्वास का</span>
                        <div className="h-[1px] w-3 bg-white/70" />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-[#3F63AD]">VALUEPLUS / ASHOKA ENTERPRISES</h2>
                      <p className="text-xs text-slate-500 font-medium">Authorised Electronics & Home Appliances Showroom</p>
                      <p className="text-[11px] text-slate-600 mt-1">H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR</p>
                      <p className="text-[11px] text-slate-600">GSTIN: 09ANHPJ7242D1Z2 · Ph: 9140860604</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-[#1B2537] text-white text-xs font-black px-3 py-1.5 rounded-md tracking-wider uppercase mb-2">
                      DELIVERY & RETURN CHALLAN
                    </span>
                    <table className="text-xs ml-auto">
                      <tbody>
                        <tr><td className="text-slate-500 pr-3">Challan No:</td><td className="font-bold font-mono text-[#3F63AD]">{selectedChallan.challanNo}</td></tr>
                        <tr><td className="text-slate-500 pr-3">Date:</td><td className="font-bold">{formatDate(selectedChallan.date)}</td></tr>
                        <tr><td className="text-slate-500 pr-3">Return Type:</td><td className="font-bold">{selectedChallan.type}</td></tr>
                        {selectedChallan.invoiceNumber && (
                          <tr><td className="text-slate-500 pr-3">Invoice Ref:</td><td className="font-bold font-mono text-blue-700">{selectedChallan.invoiceNumber}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PARTIES BLOCK */}
                <div className="grid grid-cols-2 gap-6 my-6 border-b pb-6 text-xs relative z-10">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-[#3F63AD] uppercase text-[10px] tracking-wider mb-1.5">DISPATCHED FROM (SOURCE):</p>
                    <p className="font-bold text-sm text-slate-900">{selectedChallan.sourceParty}</p>
                    {selectedChallan.sourcePhone && (
                      <p className="text-slate-500 font-mono text-[11px] mt-0.5">Ph: {selectedChallan.sourcePhone}</p>
                    )}
                    <p className="text-slate-600 mt-1 leading-relaxed">{selectedChallan.sourceAddress}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-[#3F63AD] uppercase text-[10px] tracking-wider mb-1.5">DELIVERED TO (DESTINATION):</p>
                    <p className="font-bold text-sm text-slate-900">{selectedChallan.destinationParty}</p>
                    <p className="text-slate-600 mt-1 leading-relaxed">{selectedChallan.destinationAddress}</p>
                  </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="my-4 relative z-10">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#3F63AD] text-white text-left uppercase text-[10px] tracking-wider">
                        <th className="p-2.5 rounded-l-md">#</th>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5">VP Code</th>
                        <th className="p-2.5">HSN</th>
                        <th className="p-2.5">Serial / IMEI Number</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 rounded-r-md text-right">Reason for Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-3 font-bold">1</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{selectedChallan.itemName}</p>
                          {selectedChallan.invoiceNumber && (
                            <span className="text-[10px] text-blue-700 font-mono">From Bill: #{selectedChallan.invoiceNumber}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-[#3F63AD]">{selectedChallan.vpCode || "—"}</td>
                        <td className="p-3 font-mono">{selectedChallan.hsn}</td>
                        <td className="p-3 font-mono font-semibold text-[#3F63AD]">{selectedChallan.serialImei || "—"}</td>
                        <td className="p-3 text-center font-bold">{selectedChallan.quantity} {selectedChallan.unit}</td>
                        <td className="p-3 text-right font-medium text-slate-700">{selectedChallan.reason}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* VEHICLE & TRANSPORT DETAILS */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 my-6 text-xs grid grid-cols-3 gap-4 relative z-10">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Vehicle Reg No.</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{selectedChallan.vehicleNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Driver / Courier Person</span>
                    <span className="font-bold text-slate-900">{selectedChallan.driverName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Contact Phone</span>
                    <span className="font-mono text-slate-900">{selectedChallan.driverPhone}</span>
                  </div>
                </div>

                {/* DECLARATION & SIGNATURES */}
                <div className="mt-8 pt-6 border-t border-slate-300 relative z-10 space-y-8 text-xs">
                  <p className="text-[11px] text-slate-500 italic">
                    * Declaration: This Delivery Challan is issued for stock transport/return purposes only. The goods mentioned herein do not involve any commercial sale transaction value.
                  </p>

                  <div className="flex justify-between items-end pt-6">
                    <div className="text-center">
                      <div className="w-36 border-t border-slate-400 pt-1 text-slate-600">Dispatched By Signature</div>
                    </div>
                    <div className="text-center">
                      <div className="w-36 border-t border-slate-400 pt-1 text-slate-600">Transporter Signature</div>
                    </div>
                    <div className="text-center">
                      <div className="w-44 border-t border-slate-400 pt-1 font-bold text-slate-900">
                        Authorized Receiver<br />
                        <span className="text-[10px] text-slate-500 font-normal">for Valueplus Technologies</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t text-center text-[10px] text-slate-400">
                  System Generated Delivery Challan · Powered by <b>VALUEPLUS ERP</b>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
