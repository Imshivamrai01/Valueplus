import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, Users, CreditCard, Sparkles, ShoppingCart, Plus, Trash2, Printer, 
  XCircle, Phone, UserCheck, UserPlus, X, Shield, AlertTriangle, FileText, CheckCircle2, Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { INDIA_STATES, INDIA_STATES_AND_DISTRICTS, normalizeStateName, normalizeCityName } from "@/lib/data/locations";
import { saveOfflineInvoice, getCachedCatalogItems, getCachedCustomers, cacheCustomers } from "@/lib/offline-storage";
import ValueplusInvoice from "@/app/invoice/page";
import { useSession } from "next-auth/react";

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);
}

export const WARRANTY_PROVIDERS = [
  "OneAssist",
  "Onsitego",
  "Zopper",
  "Value Plus Protect",
  "Brand Extended Care",
  "GoCare Protection",
  "Other / Custom"
];

export const WARRANTY_DURATIONS = [
  { label: "1 Year Extended Cover", value: 1 },
  { label: "2 Years Extended Cover", value: 2 },
  { label: "3 Years Extended Cover", value: 3 },
  { label: "4 Years Extended Cover", value: 4 },
  { label: "5 Years Extended Cover", value: 5 },
];

export const WARRANTY_PLANS = [
  { id: "none", name: "No Warranty", duration: 0, price: 0 },
  { id: "ew_1yr", name: "1 Year Extended Warranty", duration: 1, price: 1499 },
  { id: "ew_2yr", name: "2 Year Extended Warranty", duration: 2, price: 2799 },
  { id: "screen_care", name: "1 Year Screen & Accidental Care", duration: 1, price: 1999 },
  { id: "complete_care", name: "Comprehensive ValuePlus Protection (2 Yrs)", duration: 2, price: 3499 },
];

export function InvoiceCreationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  mode = "invoice",
  preloadedEstimate = null,
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess?: () => void; 
  mode?: "invoice" | "estimate" | "sales-order" | "credit-note";
  preloadedEstimate?: any;
}) {
  const queryClient = useQueryClient();
  const [offlineInvoiceToPrint, setOfflineInvoiceToPrint] = useState<any>(null);
  const [generatedInvoiceToPrint, setGeneratedInvoiceToPrint] = useState<any>(null);

  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role || "admin").toLowerCase();
  const currentUserName = session?.user?.name || "Staff Member";
  
  const isSuperAdmin = userRole === "admin" || userRole === "superadmin";
  const isManager = userRole === "manager" || userRole === "store_manager" || userRole === "storemanager";
  const isCashier = userRole === "cashier" || userRole === "pos" || userRole === "billing";
  const isAccountant = userRole === "accountant" || userRole === "accounts";
  
  // Cashiers, Admins, Managers, and Accountants can freely choose & change the Salesperson on any bill:
  const canChangeSalesExecutive = isSuperAdmin || isManager || isCashier || isAccountant;
  const isIndividualStaff = !canChangeSalesExecutive;

  const { data: usersList = [] } = useQuery({
    queryKey: ["users-list-for-invoice-modal"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/users");
        const json = await res.json();
        return json.success && Array.isArray(json.data) ? json.data : [];
      } catch (e) {
        return [];
      }
    },
  });

  const { data: customers = getCachedCustomers() } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/customers");
        const json = await res.json();
        return json.success ? json.data : getCachedCustomers();
      } catch (e) {
        return getCachedCustomers();
      }
    }
  });

  const { data: catalogItems = getCachedCatalogItems() } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/items");
        const json = await res.json();
        return json.success ? json.data : getCachedCatalogItems();
      } catch (e) {
        return getCachedCatalogItems();
      }
    }
  });

  const { data: serialNumbers = [] } = useQuery({
    queryKey: ["serialNumbers"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/serial-numbers?status=AVAILABLE");
        const json = await res.json();
        return json.success ? json.data : [];
      } catch (e) {
        return [];
      }
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: estimatesList = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const res = await fetch("/api/estimates");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const { data: ordersList = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  const INITIAL_BILLING_FORM = {
    invoiceNo: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerAltPhone: "",
    customerEmail: "",
    customerGstin: "",
    customerPan: "",
    customerAddress: "",
    customerCity: "Gorakhpur",
    customerState: "Uttar Pradesh",
    customerPin: "273001",
    placeOfSupply: "Uttar Pradesh(09)",
    vehicleNumber: "",
    
    // Primary Payment Mode: "Cash" | "UPI" | "Online" | "Credit Card" | "Debit Card" | "Finance" | "Due / Credit"
    paymentMode: "Cash" as "Cash" | "UPI" | "Online" | "Credit Card" | "Debit Card" | "Finance" | "Due / Credit",
    paymentStatus: "Paid",
    
    // Cash specifics
    cashReceivedBy: "Amit Singh (Counter #1)",
    cashRemarks: "",
    
    // UPI specifics
    upiTxnId: "",
    upiRemarks: "",
    
    // Online specifics
    onlineTxnId: "",
    onlineRefId: "",
    onlineGateway: "Razorpay POS",
    onlineRemarks: "",
    
    // Credit Card specifics + Admin Configurable MDR
    creditCardType: "HDFC POS EDC",
    creditCardTxnId: "",
    creditCardLast4: "",
    creditCardMdrPercent: 2.0, // Configurable MDR % by Admin
    creditCardRemarks: "",
    
    // Debit Card specifics
    debitCardType: "HDFC POS EDC",
    debitCardTxnId: "",
    debitCardLast4: "",
    debitCardMdrPercent: 0.0, // 0% standard for debit
    debitCardRemarks: "",
    
    // Finance specifics
    financeProvider: "Bajaj Finance Limited",
    financeDoId: "",
    financeAppId: "",
    financeGrossLoan: 0,
    financeDownPayment: 0,
    financeDownPaymentMode: "Cash",
    financeTenureMonths: 8,
    financeSchemeType: "no_cost",
    financeInterestRate: 0,
    financeApprovalStatus: "Approved" as "Pending" | "Under Review" | "Approved" | "Disbursed" | "Reconciled",
    financePdfUrl: "",
    financeRemarks: "",

    // Due / Credit specifics
    dueAdvanceAmount: 0,
    dueAdvanceMode: "Cash",
    dueRemarks: "",
    
    downPayment: 0,
    downPaymentMode: "Cash",
    shippingCharges: 0,
    freightCharges: 0,
    salesExecutive: "AMIT SINGH",
    advanceAmount: 0,
    linkedEstimateNumber: "",
    lineItems: [] as any[],
  };

  const [billingForm, setBillingForm] = useState(INITIAL_BILLING_FORM);

  useEffect(() => {
    if (!isOpen) {
      setBillingForm(INITIAL_BILLING_FORM);
    } else {
      if (isIndividualStaff && currentUserName) {
        setBillingForm((prev) => ({ ...prev, salesExecutive: currentUserName }));
      }
    }
  }, [isOpen, isIndividualStaff, currentUserName]);

  useEffect(() => {
    if (isOpen && !billingForm.invoiceNo) {
      setBillingForm(prev => {
        let newNo = "";
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        if (mode === "estimate") {
          newNo = `EST-2026-${String(estimatesList.length + 1).padStart(4, "0")}-${randomSuffix}`;
        } else if (mode === "sales-order") {
          newNo = `SO-2026-${String(ordersList.length + 1).padStart(4, "0")}-${randomSuffix}`;
        } else if (mode === "credit-note") {
          newNo = `CN-2026-${String(invoices.filter((i:any) => i.type === "credit-note").length + 1).padStart(4, "0")}-${randomSuffix}`;
        } else {
          newNo = `SVAK2026RI${String(invoices.filter((i:any) => i.type !== "credit-note").length + 602).padStart(5, "0")}`;
        }
        return { ...prev, invoiceNo: newNo, salesExecutive: isIndividualStaff ? currentUserName : prev.salesExecutive };
      });
    }
  }, [invoices.length, estimatesList.length, ordersList.length, isOpen, billingForm.invoiceNo, mode, isIndividualStaff, currentUserName]);

  const [activeSuggestRow, setActiveSuggestRow] = useState<number | null>(null);

  // Admin PIN Floor Price Override States
  const [pinPrompt, setPinPrompt] = useState<{
    idx: number;
    proposedRate: number;
    minPrice: number;
    itemName: string;
  } | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Billing & GST Calculations
  const billCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTaxable = 0;
    let totalGst = 0;
    let warrantyTotal = 0;
    let totalIncentive = 0;

    billingForm.lineItems.forEach((item) => {
      const lineTaxable = ((Number(item.rate) || 0) - (Number(item.discount) || 0)) * (Number(item.qty) || 1);
      const lineGst = lineTaxable * ((Number(item.gstRate) || 0) / 100);
      subtotal += (Number(item.rate) || 0) * (Number(item.qty) || 1);
      totalTaxable += lineTaxable;
      totalGst += lineGst;
      if (item.extendedWarrantyAmount) {
        warrantyTotal += Number(item.extendedWarrantyAmount);
      }

      // Compute salesperson incentive for this item based on target selling price
      let lineInc = 0;
      const targetAmt = Number(item.incentiveTargetAmount) || 0;
      const rewardVal = Number(item.incentiveValue) || Number(item.incentiveAmount) || 0;
      const incType = item.incentiveType || "fixed";
      const currentRate = Number(item.rate) || 0;
      const qty = Number(item.qty) || 1;

      if (rewardVal > 0 && incType !== "none") {
        const isTargetMet = targetAmt <= 0 || currentRate >= targetAmt;
        if (isTargetMet) {
          if (incType === "percentage") {
            lineInc = lineTaxable * (rewardVal / 100);
          } else {
            lineInc = rewardVal * qty;
          }
        }
      }
      totalIncentive += lineInc;
    });

    const isIntraState = billingForm.placeOfSupply.includes("09") || billingForm.placeOfSupply.toLowerCase().includes("uttar pradesh");
    const cgst = isIntraState ? totalGst / 2 : 0;
    const sgst = isIntraState ? totalGst / 2 : 0;
    const igst = isIntraState ? 0 : totalGst;
    
    // Product grand total + warranty + freight/shipping
    const freight = Number(billingForm.freightCharges || billingForm.shippingCharges || 0);
    const rawTotal = totalTaxable + totalGst + warrantyTotal + freight;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Number((grandTotal - rawTotal).toFixed(2));

    // Card MDR Calculation: MDR % of grand total, Net Settlement = grandTotal - MDR
    const isCreditCard = billingForm.paymentMode === "Credit Card";
    const isDebitCard = billingForm.paymentMode === "Debit Card";
    const isCard = isCreditCard || isDebitCard;

    const activeMdrPercent = isCreditCard 
      ? Number(billingForm.creditCardMdrPercent ?? 2.0) 
      : (isDebitCard ? Number(billingForm.debitCardMdrPercent ?? 0.0) : 0);

    const cardMdrAmount = Number(((grandTotal * activeMdrPercent) / 100).toFixed(2));
    const cardNetSettlement = Number((grandTotal - cardMdrAmount).toFixed(2));

    return { 
      subtotal, 
      totalTaxable, 
      totalGst, 
      cgst, 
      sgst, 
      igst, 
      warrantyTotal, 
      freight,
      totalIncentive: Math.round(totalIncentive * 100) / 100,
      roundOff, 
      grandTotal,
      activeMdrPercent,
      cardMdrAmount,
      cardNetSettlement
    };
  }, [billingForm]);

  const [phoneLookupStatus, setPhoneLookupStatus] = useState<"idle" | "existing" | "new">("idle");
  const [matchedEstimate, setMatchedEstimate] = useState<any>(null);

  const handleLoadEstimate = (est: any) => {
    if (!est) return;

    // 1. Map items from estimate
    const newItems = (est.items && est.items.length > 0)
      ? est.items.map((it: any, idx: number) => {
          const matchedCatalog = catalogItems.find((cat: any) => 
            (it.itemCode && cat.itemCode === it.itemCode) || 
            (it.name && (cat.name === it.name || cat.itemName === it.name))
          );

          const gst = Number(it.tax) || Number(it.gstRate) || (matchedCatalog?.gstRate || 18);
          const rate = Number(it.rate) || Number(matchedCatalog?.sellingPrice || 0);
          const qty = Number(it.quantity || it.qty || 1);

          return {
            id: `est-item-${Date.now()}-${idx}`,
            name: it.name || it.itemName || matchedCatalog?.name || "Product Item",
            itemCode: it.itemCode || matchedCatalog?.itemCode || "8471",
            vpCode: matchedCatalog?.vpCode || it.vpCode || "",
            serialNumber: it.serialNumber || "",
            batchNumber: it.batchNumber || "",
            qty,
            rate,
            minSellingPrice: matchedCatalog?.minSellingPrice || 0,
            incentiveTargetAmount: matchedCatalog?.incentiveTargetAmount || 0,
            incentiveAmount: matchedCatalog?.incentiveAmount || 0,
            adminApprovedRate: false,
            incentiveType: matchedCatalog?.incentiveType || "fixed",
            incentiveValue: matchedCatalog?.incentiveValue || 0,
            discount: Number(it.discount) || 0,
            gstRate: gst,
            availableStock: matchedCatalog?.currentStock || matchedCatalog?.openingStock || 10,
            extendedWarrantyProvider: "OneAssist",
            extendedWarrantyPlan: "none",
            extendedWarrantyAmount: 0,
            extendedWarrantyDuration: 1,
            extendedWarrantyStartDate: new Date().toISOString().split("T")[0],
            extendedWarrantyEndDate: "",
            extendedWarrantyHsn: "",
            extendedWarrantySerial: "",
          };
        })
      : [
          {
            id: String(Date.now()),
            name: "Estimate Item",
            itemCode: "8471",
            vpCode: "",
            serialNumber: "",
            batchNumber: "",
            qty: 1,
            rate: Number(est.total) || 1000,
            minSellingPrice: 0,
            incentiveTargetAmount: 0,
            incentiveAmount: 0,
            adminApprovedRate: false,
            incentiveType: "fixed",
            incentiveValue: 0,
            discount: 0,
            gstRate: 18,
            availableStock: 10,
            extendedWarrantyProvider: "OneAssist",
            extendedWarrantyPlan: "none",
            extendedWarrantyAmount: 0,
            extendedWarrantyDuration: 1,
            extendedWarrantyStartDate: new Date().toISOString().split("T")[0],
            extendedWarrantyEndDate: "",
            extendedWarrantyHsn: "",
            extendedWarrantySerial: "",
          },
        ];

    setBillingForm((prev: any) => ({
      ...prev,
      customerName: est.customerName || prev.customerName,
      customerPhone: (est.customerPhone || prev.customerPhone || "").replace(/\D/g, ""),
      customerAddress: est.customerAddress || prev.customerAddress || "",
      customerGstin: est.customerGST || prev.customerGstin || "",
      notes: prev.notes ? `${prev.notes} • Linked to Estimate ${est.estimateNumber}` : `Linked to Estimate ${est.estimateNumber}`,
      linkedEstimateNumber: est.estimateNumber,
      lineItems: newItems,
    }));

    toast.success(`Estimate ${est.estimateNumber} items & details imported successfully!`);
  };

  useEffect(() => {
    if (isOpen && preloadedEstimate) {
      handleLoadEstimate(preloadedEstimate);
    }
  }, [isOpen, preloadedEstimate]);

  const handlePhoneLookup = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    setBillingForm((prev) => ({ ...prev, customerPhone: cleanPhone }));

    if (cleanPhone.length < 10) {
      setPhoneLookupStatus("idle");
      setMatchedEstimate(null);
      return;
    }

    if (cleanPhone.length === 10) {
      // 1. Check for Active Estimate
      const activeEst = estimatesList.find((est: any) => {
        const estPhone = (est.customerPhone || "").replace(/\D/g, "");
        return (estPhone.endsWith(cleanPhone) || cleanPhone.endsWith(estPhone)) && est.status !== "Converted";
      });
      if (activeEst) {
        setMatchedEstimate(activeEst);
      } else {
        setMatchedEstimate(null);
      }

      // 2. Check Customer Master
      const found = customers.find((c: any) => c.phone === cleanPhone);
      if (found) {
        const normalizedState = normalizeStateName(found.billingAddress?.state || found.state || "Uttar Pradesh");
        setBillingForm((prev) => ({
          ...prev,
          customerId: found._id,
          customerName: found.name,
          customerPhone: cleanPhone,
          customerAltPhone: found.altPhone || found.customerAltPhone || prev.customerAltPhone || "",
          customerEmail: found.email || "",
          customerGstin: found.gstNumber || found.gst || "",
          customerPan: found.panNumber || "",
          placeOfSupply: normalizedState.includes("09") ? normalizedState : `${normalizedState}(09)`,
          customerCity: normalizeCityName(found.billingAddress?.city || found.city || "Gorakhpur", normalizedState),
          customerPin: found.billingAddress?.pincode || found.pin || found.pincode || "273001",
          customerAddress: found.billingAddress?.line1 ? `${found.billingAddress.line1}` : found.address || "",
        }));
        setPhoneLookupStatus("existing");
        toast.success(`Customer found: ${found.name}`);
      } else if (activeEst) {
        setBillingForm((prev) => ({
          ...prev,
          customerId: "new",
          customerName: activeEst.customerName || prev.customerName,
          customerPhone: cleanPhone,
          customerAddress: activeEst.customerAddress || prev.customerAddress,
          customerGstin: activeEst.customerGST || prev.customerGstin,
        }));
        setPhoneLookupStatus("existing");
      } else {
        setBillingForm((prev) => ({
          ...prev,
          customerId: "new",
          customerPhone: cleanPhone,
        }));
        setPhoneLookupStatus("new");
      }
    }
  };

  const addLineItem = () => {
    setBillingForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { 
          id: String(Date.now()), 
          name: "", 
          itemCode: "", 
          vpCode: "", 
          serialNumber: "", 
          batchNumber: "", 
          qty: 1, 
          rate: 0, 
          minSellingPrice: 0,
          incentiveTargetAmount: 0,
          incentiveAmount: 0,
          adminApprovedRate: false,
          incentiveType: "fixed",
          incentiveValue: 0,
          discount: 0, 
          gstRate: 18, 
          availableStock: 0,
          extendedWarrantyProvider: "OneAssist",
          extendedWarrantyPlan: "none",
          extendedWarrantyAmount: 0,
          extendedWarrantyDuration: 1,
          extendedWarrantyPolicyNo: "",
        },
      ],
    }));
  };

  const removeLineItem = (idx: number) => {
    setBillingForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx),
    }));
  };

  const handleLineItemChange = (idx: number, field: string, value: any) => {
    const updated = [...billingForm.lineItems];
    if (field === "qty" && mode === "invoice") {
      const maxStock = updated[idx].availableStock !== undefined ? updated[idx].availableStock : Infinity;
      if (value > maxStock) {
        toast.warning(`Warning: Requested ${value} units exceeds available stock of ${maxStock}!`);
      }
    }
    
    if (field === "extendedWarrantyPlan") {
      const plan = WARRANTY_PLANS.find(p => p.id === value);
      if (plan && plan.id !== "none") {
        updated[idx] = {
          ...updated[idx],
          extendedWarrantyPlan: plan.name,
          extendedWarrantyAmount: plan.price,
          extendedWarrantyDuration: plan.duration,
          extendedWarrantyProvider: updated[idx].extendedWarrantyProvider || "OneAssist",
        };
      } else if (value === "none") {
        updated[idx] = {
          ...updated[idx],
          extendedWarrantyPlan: "none",
          extendedWarrantyAmount: 0,
          extendedWarrantyDuration: 0,
          extendedWarrantyProvider: "",
          extendedWarrantyPolicyNo: "",
        };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    
    setBillingForm((prev) => ({ ...prev, lineItems: updated }));
  };

  // Rate change attempt with floor price protection & Admin PIN prompt
  const handleRateChangeAttempt = (idx: number, newRate: number) => {
    const item = billingForm.lineItems[idx];
    const minPrice = Number(item.minSellingPrice) || 0;

    // Check if new rate is below min allowed price and not authorized yet
    if (minPrice > 0 && newRate < minPrice && !item.adminApprovedRate) {
      setPinPrompt({
        idx,
        proposedRate: newRate,
        minPrice,
        itemName: item.name || "Selected Product",
      });
      setEnteredPin("");
      setPinError(false);
      return;
    }

    handleLineItemChange(idx, "rate", newRate);
  };

  const handleVerifyAdminPin = () => {
    const ADMIN_PIN = "1234";
    if (enteredPin.trim() === ADMIN_PIN) {
      if (pinPrompt) {
        const updated = [...billingForm.lineItems];
        updated[pinPrompt.idx] = {
          ...updated[pinPrompt.idx],
          rate: pinPrompt.proposedRate,
          adminApprovedRate: true,
        };
        setBillingForm((prev) => ({ ...prev, lineItems: updated }));
        toast.success(`✅ Admin Authorization Approved! Below-floor rate ₹${pinPrompt.proposedRate} unlocked for ${pinPrompt.itemName}`);
      }
      setPinPrompt(null);
      setEnteredPin("");
      setPinError(false);
    } else {
      setPinError(true);
      toast.error("❌ Invalid Admin PIN! Cannot bill below minimum price without supervisor authorization.");
    }
  };

  const selectProductSuggestion = (idx: number, prod: any) => {
    const isOutOfStock = (prod.currentStock || 0) <= 0;
    if (isOutOfStock && mode === "invoice") {
      toast.error(`"${prod.name}" is OUT OF STOCK. Cannot be billed in a Tax Invoice.`);
      return;
    }

    const updated = [...billingForm.lineItems];
    const itemVpCode = prod.vpCode || prod.code;
    updated[idx] = {
      ...updated[idx],
      name: prod.name,
      rate: prod.sellingPrice || prod.rate || 0,
      minSellingPrice: prod.minSellingPrice || prod.purchasePrice || 0,
      incentiveTargetAmount: prod.incentiveTargetAmount || prod.sellingPrice || 0,
      incentiveAmount: prod.incentiveAmount || prod.incentiveValue || 0,
      incentiveType: prod.incentiveType || "fixed",
      incentiveValue: prod.incentiveAmount || prod.incentiveValue || 0,
      adminApprovedRate: false,
      gstRate: prod.gstRate || 18,
      itemCode: prod.code,
      vpCode: itemVpCode,
      itemId: prod._id,
      availableStock: prod.currentStock !== undefined ? prod.currentStock : 0,
      batchNumber: prod.batchNumber || "",
      isSerialized: prod.isSerialized || false,
    };
    
    if (isOutOfStock) {
      toast.warning(`Notice: ${prod.name} is OUT OF STOCK.`);
    } else {
      toast.info(`Selected: ${prod.name} (VP Code: ${itemVpCode}) — Available Stock: ${prod.currentStock}`);
    }

    setBillingForm((prev) => ({ ...prev, lineItems: updated }));
    setActiveSuggestRow(null);
  };

  const createInvoiceMutation = useMutation({
    networkMode: "always",
    mutationFn: async (payload: any) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const offlineRecord = saveOfflineInvoice(payload);
        return { isOffline: true, data: offlineRecord };
      }

      if (payload.type === "estimate") {
        try {
          await fetch("/api/estimates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              estimateNumber: payload.invoiceNumber,
              customerName: payload.customerName,
              customerPhone: payload.customerPhone,
              customerAddress: payload.customerAddress,
              customerGST: payload.customerGstin,
              salesExecutive: payload.salesExecutive,
              salesperson: payload.salesExecutive,
              createdBy: payload.createdBy,
              date: payload.date,
              expiryDate: payload.dueDate,
              items: payload.items,
              subtotal: payload.subtotal,
              taxableAmount: payload.taxableAmount,
              totalGST: payload.totalGST,
              total: payload.total,
              status: "Sent",
              notes: payload.notes || "Official Estimate Generated",
            }),
          });
        } catch (e) {
          console.error("Error creating Estimate record:", e);
        }
      }

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to generate invoice");
      return { isOffline: false, data: json.data };
    },
    onSuccess: (result: any) => {
      if (result.isOffline) {
        toast.warning("⚡ Saved locally in offline queue. Auto-sync on connection.", { duration: 5000 });
        setOfflineInvoiceToPrint(result.data);
      } else {
        toast.success(mode === "estimate" ? `Estimate ${result.data?.invoiceNumber || ""} created & recorded!` : `Invoice ${result.data?.invoiceNumber || ""} finalized successfully!`);
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["estimates"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["items"] });
        queryClient.invalidateQueries({ queryKey: ["serialNumbers"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        setGeneratedInvoiceToPrint(result.data);
        onSuccess && onSuccess();
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate invoice");
    }
  });

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "invoice" && isIndividualStaff) {
      toast.error("Sales staff cannot generate official Tax Invoices. Official billing is handled exclusively by the Store Cashier / Admin desk. Please create an Estimate instead.");
      return;
    }

    if (!billingForm.customerName.trim()) {
      toast.error("Customer Name is mandatory.");
      return;
    }
    if (!billingForm.customerPhone || billingForm.customerPhone.length !== 10) {
      toast.error("Valid 10-digit Customer Mobile number is mandatory.");
      return;
    }
    if (billingForm.lineItems.length === 0) {
      toast.error("Please add at least 1 product item to the bill.");
      return;
    }

    if (mode === "invoice") {
      for (const it of billingForm.lineItems) {
        if (it.availableStock !== undefined && it.availableStock <= 0) {
          toast.error(`"${it.name}" is OUT OF STOCK. Cannot generate a Tax Invoice.`);
          return;
        }
        if (it.availableStock !== undefined && it.qty > it.availableStock) {
          toast.error(`Quantity for "${it.name}" (${it.qty}) exceeds available on-hand stock (${it.availableStock}).`);
          return;
        }
      }
    }

    const formattedItems = billingForm.lineItems.map(item => {
      const lineTaxable = ((Number(item.rate) || 0) - (Number(item.discount) || 0)) * (Number(item.qty) || 1);
      const lineGst = lineTaxable * ((Number(item.gstRate) || 0) / 100);
      const isIntraState = billingForm.placeOfSupply.includes("09") || billingForm.placeOfSupply.toLowerCase().includes("uttar pradesh");
      
      let lineInc = 0;
      const targetAmt = Number(item.incentiveTargetAmount) || 0;
      const rewardVal = Number(item.incentiveValue) || Number(item.incentiveAmount) || 0;
      const incType = item.incentiveType || "fixed";
      const currentRate = Number(item.rate) || 0;
      const qty = Number(item.qty) || 1;

      if (rewardVal > 0 && incType !== "none") {
        const isTargetMet = targetAmt <= 0 || currentRate >= targetAmt;
        if (isTargetMet) {
          if (incType === "percentage") {
            lineInc = lineTaxable * (rewardVal / 100);
          } else {
            lineInc = rewardVal * qty;
          }
        }
      }

      return {
        itemId: item.itemId || `ITEM-${Date.now()}`,
        itemName: item.name,
        brand: item.brand || item.brandName || "Showroom Partner",
        itemCode: item.itemCode || "GEN",
        vpCode: item.vpCode || item.itemCode || "",
        description: item.serialNumber ? `Serial/IMEI: ${item.serialNumber}` : (item.batchNumber ? `Batch: ${item.batchNumber}` : ""),
        quantity: item.qty,
        unit: "PCS",
        rate: item.rate,
        minSellingPrice: item.minSellingPrice || 0,
        incentiveTargetAmount: targetAmt,
        incentiveAmount: rewardVal,
        adminOverrideRate: item.adminApprovedRate || false,
        incentiveType: incType,
        incentiveValue: rewardVal,
        incentiveEarned: Math.round(lineInc * 100) / 100,
        discount: item.discount,
        discountType: "amount",
        taxableAmount: lineTaxable,
        gstRate: item.gstRate,
        cgst: isIntraState ? lineGst / 2 : 0,
        sgst: isIntraState ? lineGst / 2 : 0,
        igst: isIntraState ? 0 : lineGst,
        amount: lineTaxable + lineGst + (Number(item.extendedWarrantyAmount) || 0),
        serialNumber: item.serialNumber || "",
        batchNumber: item.batchNumber || "",
        extendedWarrantyProvider: item.extendedWarrantyProvider || "",
        extendedWarrantyPlan: item.extendedWarrantyPlan && item.extendedWarrantyPlan !== "none" ? item.extendedWarrantyPlan : (item.extendedWarrantyAmount > 0 ? `${item.extendedWarrantyDuration || 1} Year Plan` : ""),
        extendedWarrantyAmount: Number(item.extendedWarrantyAmount) || 0,
        extendedWarrantyDuration: Number(item.extendedWarrantyDuration) || 0,
        extendedWarrantyPolicyNo: item.extendedWarrantyPolicyNo || "",
      };
    });

    const isFinance = billingForm.paymentMode === "Finance";
    const isDueCredit = billingForm.paymentMode === "Due / Credit";
    const downPay = isFinance ? (Number(billingForm.financeDownPayment) || 0) : (isDueCredit ? (Number(billingForm.advanceAmount || billingForm.dueAdvanceAmount) || 0) : billCalculations.grandTotal);
    const paidAmt = isFinance ? downPay : (isDueCredit ? downPay : billCalculations.grandTotal);
    const balanceAmt = Math.max(0, billCalculations.grandTotal - paidAmt);

    createInvoiceMutation.mutate({
      ...billingForm,
      invoiceNumber: billingForm.invoiceNo,
      type: mode === "credit-note" ? "credit-note" : (mode === "sales-order" ? "sales-order" : (mode === "estimate" ? "estimate" : "tax-invoice")),
      salesExecutive: isIndividualStaff ? currentUserName : (billingForm.salesExecutive || currentUserName),
      salesperson: isIndividualStaff ? currentUserName : (billingForm.salesExecutive || currentUserName),
      createdBy: currentUserName,
      date: billingForm.invoiceDate,
      dueDate: billingForm.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      customerName: billingForm.customerName,
      customerPhone: billingForm.customerPhone,
      customerAltPhone: billingForm.customerAltPhone || "",
      customerAddress: billingForm.customerAddress,
      customerCity: billingForm.customerCity,
      customerState: billingForm.customerState,
      customerPin: billingForm.customerPin,
      placeOfSupply: billingForm.placeOfSupply,
      vehicleNumber: billingForm.vehicleNumber,
      
      salesExecutiveIncentive: billCalculations.totalIncentive,
      adminOverridePinUsed: billingForm.lineItems.some(i => i.adminApprovedRate),
      
      items: formattedItems,
      subtotal: billCalculations.subtotal,
      taxableAmount: billCalculations.totalTaxable,
      totalGST: billCalculations.totalGst,
      cgst: billCalculations.cgst,
      sgst: billCalculations.sgst,
      igst: billCalculations.igst,
      extendedWarrantyTotal: billCalculations.warrantyTotal,
      shippingCharges: Number(billingForm.freightCharges || billingForm.shippingCharges || 0),
      freightCharges: Number(billingForm.freightCharges || billingForm.shippingCharges || 0),
      roundOff: billCalculations.roundOff,
      total: billCalculations.grandTotal,
      
      paidAmount: paidAmt,
      balanceAmount: balanceAmt,
      status: balanceAmt === 0 ? "paid" : (paidAmt > 0 ? "partial" : "sent"),
      
      // Payment specifics
      cardCategory: billingForm.paymentMode === "Credit Card" ? "Credit Card" : (billingForm.paymentMode === "Debit Card" ? "Debit Card" : "Card"),
      cardType: billingForm.paymentMode === "Credit Card" 
        ? billingForm.creditCardType 
        : (billingForm.paymentMode === "Debit Card" ? billingForm.debitCardType : ""),
      cardTxnId: billingForm.paymentMode === "Credit Card" 
        ? billingForm.creditCardTxnId 
        : (billingForm.paymentMode === "Debit Card" ? billingForm.debitCardTxnId : ""),
      cardLast4: billingForm.paymentMode === "Credit Card" 
        ? billingForm.creditCardLast4 
        : (billingForm.paymentMode === "Debit Card" ? billingForm.debitCardLast4 : ""),
      cardMdrPercent: isCard ? billCalculations.activeMdrPercent : 0,
      cardMdrAmount: isCard ? billCalculations.cardMdrAmount : 0,
      cardNetSettlement: isCard ? billCalculations.cardNetSettlement : 0,
      
      financeProvider: isFinance ? billingForm.financeProvider : "",
      financeDoId: isFinance ? billingForm.financeDoId : "",
      financeAppId: isFinance ? billingForm.financeAppId : "",
      financeDownPayment: isFinance ? (Number(billingForm.financeDownPayment) || 0) : 0,
      financeDownPaymentMode: isFinance ? (billingForm.financeDownPaymentMode || "Cash") : "",
      financeGrossLoan: isFinance ? (billCalculations.grandTotal - downPay) : 0,
      financeNetLoan: isFinance ? (billCalculations.grandTotal - downPay) : 0,

      // Due specifics
      dueAdvanceAmount: isDueCredit ? (Number(billingForm.advanceAmount || billingForm.dueAdvanceAmount) || 0) : 0,
      dueAdvanceMode: isDueCredit ? (billingForm.dueAdvanceMode || "Cash") : "",
      notes: billingForm.dueRemarks || billingForm.cashRemarks || billingForm.upiRemarks || "",
    });
  };

  return (
    <>
      <Dialog open={isOpen && !offlineInvoiceToPrint} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B2537] via-[#243753] to-[#1B2537] text-white p-6 rounded-t-2xl flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Receipt className="w-6 h-6 text-[#76C043]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  {mode === "estimate" ? "Create Commercial Estimate" : mode === "sales-order" ? "Sales Order Booking" : mode === "credit-note" ? "Issue Credit Note" : "Value Plus Tax Invoice Billing"}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#76C043]/20 text-[#76C043] border border-[#76C043]/30 font-mono font-bold">
                    {mode === "credit-note" ? "CREDIT NOTE" : "TAX INVOICE (ORIGINAL)"}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  M/S ASHOKA ENTERPRISES • Gorakhpur, Uttar Pradesh • GSTIN: 09ANHPJ7242D1Z2
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleFinalSubmit} className="p-6 space-y-6 bg-slate-50/70">
            {/* SECTION 1: CUSTOMER-FIRST BILLING FORM */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#3F63AD]" /> 1. CUSTOMER PARTICULARS (CUSTOMER-FIRST IDENTIFICATION)
                </h4>
                <div className="text-xs text-slate-500 font-semibold">
                  Default: <span className="text-[#3F63AD] font-bold">Gorakhpur, Uttar Pradesh</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. CUSTOMER NAME — RESTRICTED TO ALPHABETS ONLY */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Customer Name * <span className="text-[10px] text-slate-500 font-normal">(Alphabets & spaces only)</span>
                  </Label>
                  <Input 
                    placeholder="e.g. Ajay Tiwari / Mohd Dilshad" 
                    value={billingForm.customerName} 
                    onChange={(e) => {
                      const cleanLetters = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                      setBillingForm({ ...billingForm, customerName: cleanLetters });
                    }} 
                    className="bg-slate-50 border-slate-300 font-bold text-slate-900"
                    autoFocus
                  />
                </div>

                {/* 2. PRIMARY MOBILE NUMBER */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#3F63AD]" /> Mobile Number *
                  </Label>
                  <div className="relative">
                    <Input 
                      type="text"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={billingForm.customerPhone} 
                      onChange={(e) => handlePhoneLookup(e.target.value)}
                      className={cn(
                        "bg-slate-50 border-slate-300 font-mono tracking-wider",
                        phoneLookupStatus === "existing" && "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-100",
                        phoneLookupStatus === "new" && "border-amber-400 bg-amber-50/50 ring-2 ring-amber-100"
                      )}
                    />
                    {phoneLookupStatus === "existing" && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">✓ Exists</span>
                    )}
                  </div>
                </div>

                {/* 2b. ALTERNATE MOBILE NUMBER */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Alternate Mobile (Optional)
                  </Label>
                  <Input 
                    type="text"
                    maxLength={10}
                    placeholder="10-digit alt phone"
                    value={billingForm.customerAltPhone || ""} 
                    onChange={(e) => setBillingForm({ ...billingForm, customerAltPhone: e.target.value.replace(/\D/g, '') })}
                    className="bg-slate-50 border-slate-300 font-mono tracking-wider text-xs"
                  />
                </div>

                {/* 3. DOCUMENT NUMBER */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Doc / Invoice No.</Label>
                  <Input value={billingForm.invoiceNo} onChange={e => setBillingForm({ ...billingForm, invoiceNo: e.target.value })} className="font-mono text-xs font-bold text-[#3F63AD] bg-blue-50/60 border-blue-200" />
                </div>

                {/* 4. ADDRESS */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Billing & Delivery Address</Label>
                  <Input 
                    placeholder="e.g. C31 Divya Nagar / Turkmanpur, Gita Press" 
                    value={billingForm.customerAddress} 
                    onChange={(e) => setBillingForm({ ...billingForm, customerAddress: e.target.value })} 
                    className="bg-slate-50 border-slate-300"
                  />
                </div>

                {/* 5. STATE (DEFAULT: UTTAR PRADESH) */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">State (Prefilled)</Label>
                  <Select value={billingForm.customerState} onValueChange={(v) => setBillingForm({ ...billingForm, customerState: v, placeOfSupply: `${v}(09)` })}>
                    <SelectTrigger className="bg-slate-50 border-slate-300 font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INDIA_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. CITY / DISTRICT (DEFAULT: GORAKHPUR) */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">City / District (Prefilled)</Label>
                  <Input 
                    value={billingForm.customerCity} 
                    onChange={(e) => setBillingForm({ ...billingForm, customerCity: e.target.value })} 
                    className="bg-slate-50 border-slate-300 font-semibold"
                  />
                </div>

                {/* 7. GSTIN */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">Customer GSTIN (Optional)</Label>
                  <Input placeholder="09XXXXX1234X1ZX" value={billingForm.customerGstin} onChange={(e) => setBillingForm({ ...billingForm, customerGstin: e.target.value })} className="font-mono bg-slate-50 border-slate-300 text-xs uppercase" />
                </div>

                {/* 8. PAN */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">Customer PAN (Optional)</Label>
                  <Input placeholder="ABCDE1234F" value={billingForm.customerPan} onChange={(e) => setBillingForm({ ...billingForm, customerPan: e.target.value })} className="font-mono bg-slate-50 border-slate-300 text-xs uppercase" />
                </div>

                {/* 9. FREIGHT / SHIPPING CHARGES (OPTIONAL) */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" /> Freight / Delivery Fee <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0.00 (Optional)" 
                    value={billingForm.freightCharges || billingForm.shippingCharges || ""} 
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setBillingForm({ ...billingForm, freightCharges: val, shippingCharges: val });
                    }} 
                    className="font-mono bg-slate-50 border-slate-300 text-xs font-bold text-slate-800"
                  />
                </div>

                {/* 10. VEHICLE NUMBER */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" /> Vehicle Number (Optional)
                  </Label>
                  <Input 
                    placeholder="e.g. UP53 CA 1234" 
                    value={billingForm.vehicleNumber} 
                    onChange={(e) => setBillingForm({ ...billingForm, vehicleNumber: e.target.value })} 
                    className="font-mono bg-slate-50 border-slate-300 uppercase text-xs"
                  />
                </div>

                {/* 11. SALES EXECUTIVE */}
                <div className="space-y-1.5 md:col-span-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Sales Executive</Label>
                    {isIndividualStaff && (
                      <span className="text-[10px] text-amber-800 font-mono font-bold bg-amber-100/70 px-1 rounded border border-amber-300">
                        🔒 Auto Locked
                      </span>
                    )}
                  </div>
                  {isIndividualStaff ? (
                    <div className="h-9 px-3 bg-slate-100 border border-slate-300 rounded-md flex items-center justify-between font-bold text-xs text-[#30539C] select-none shadow-inner cursor-not-allowed">
                      <span>👤 {currentUserName}</span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">{userRole}</span>
                    </div>
                  ) : (
                    <Select
                      value={billingForm.salesExecutive}
                      onValueChange={(v) => setBillingForm({ ...billingForm, salesExecutive: v })}
                    >
                      <SelectTrigger className="bg-blue-50/50 border-blue-200 font-bold text-[#3F63AD]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {usersList.length > 0 ? (
                          usersList.map((u: any) => (
                            <SelectItem key={u._id || u.email} value={u.name}>
                              {u.name} ({u.role?.toUpperCase() || "STAFF"})
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="AMIT SINGH">AMIT SINGH (Head Store Exec)</SelectItem>
                            <SelectItem value="ROHAN VERMA">ROHAN VERMA (Electronics)</SelectItem>
                            <SelectItem value="PRIYA SHARMA">PRIYA SHARMA (Appliances)</SelectItem>
                            <SelectItem value="VIKAS GUPTA">VIKAS GUPTA (Mobiles)</SelectItem>
                            <SelectItem value="STORE MANAGER">STORE MANAGER (VIP Desk)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* ACTIVE ESTIMATE FOUND BANNER */}
              {matchedEstimate && (
                <div className="mt-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black flex-shrink-0 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                          Active Quotation / Estimate Found:
                        </span>
                        <Badge className="bg-amber-200 text-amber-950 font-mono text-[11px] font-bold border-amber-300">
                          {matchedEstimate.estimateNumber}
                        </Badge>
                        <span className="font-mono font-black text-xs text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                          ₹{Number(matchedEstimate.total || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 truncate mt-0.5">
                        Customer: <span className="font-bold">{matchedEstimate.customerName}</span> • Products: <span className="font-medium">{matchedEstimate.items?.map((it: any) => it.name).join(", ") || "Quotation Line Items"}</span>
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleLoadEstimate(matchedEstimate)}
                    className="h-8.5 px-4 text-xs font-black bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm flex-shrink-0 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" /> Load Estimate Items into Bill
                  </Button>
                </div>
              )}
            </div>

            {/* SECTION 2: ITEMS, VP CODES, STOCK, SERIALS & EXTENDED WARRANTY */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-[#3F63AD]" /> 2. PRODUCTS, VP CODES, INVENTORY STOCK & SERIAL / WARRANTY
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select product to inspect live stock. For serialized units, choose from available serial numbers.
                  </p>
                </div>
                <Button type="button" size="sm" onClick={addLineItem} variant="outline" className="text-xs gap-1 border-[#3F63AD] text-[#3F63AD] font-bold">
                  <Plus className="w-3.5 h-3.5" /> Add Product Item
                </Button>
              </div>

              <div className="space-y-3">
                {billingForm.lineItems.map((item, idx) => {
                  const lineTaxable = ((Number(item.rate) || 0) - (Number(item.discount) || 0)) * (Number(item.qty) || 1);
                  const lineGst = lineTaxable * ((Number(item.gstRate) || 0) / 100);
                  const warrantyAmt = Number(item.extendedWarrantyAmount) || 0;
                  const lineTotal = lineTaxable + lineGst + warrantyAmt;

                  const query = (item.name || "").toLowerCase().trim();
                  const suggestions = query === ""
                    ? catalogItems
                    : catalogItems.filter(
                        (p: any) => p.name.toLowerCase().includes(query) || (p.code || "").toLowerCase().includes(query) || (p.vpCode || "").toLowerCase().includes(query)
                      );

                  // Filter available serial numbers for this item with robust matching
                  const itNameLower = (item.name || "").toLowerCase().trim();
                  const itCodeLower = (item.itemCode || "").toLowerCase().trim();
                  const itVpLower = (item.vpCode || "").toLowerCase().trim();
                  const itIdStr = item.itemId ? item.itemId.toString() : "";

                  const matchingSerials = serialNumbers.filter((s: any) => {
                    if (s.status !== "AVAILABLE") return false;
                    // Exclude if already chosen in another line item in the same invoice
                    const isSelectedInOtherRow = billingForm.lineItems.some((otherLine, otherIdx) => otherIdx !== idx && otherLine.serialNumber === s.serialNumber);
                    if (isSelectedInOtherRow) return false;

                    const sVp = (s.vpCode || "").toLowerCase().trim();
                    const sId = (s.itemId || "").toString();
                    const sName = (s.itemName || "").toLowerCase().trim();

                    if (itVpLower && sVp && sVp === itVpLower) return true;
                    if (itIdStr && sId && sId === itIdStr) return true;
                    if (itNameLower && sName && (sName === itNameLower || sName.includes(itNameLower) || itNameLower.includes(sName))) return true;
                    if (itCodeLower && sVp && (sVp === itCodeLower || sVp.includes(itCodeLower))) return true;

                    return false;
                  });

                  return (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#3F63AD] text-white flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {item.name ? item.name : "Select or search product item..."}
                          </span>
                          {item.vpCode && (
                            <Badge variant="outline" className="font-mono text-[10px] font-bold bg-blue-50 text-[#3F63AD] border-blue-200">
                              VP CODE: {item.vpCode}
                            </Badge>
                          )}
                          {item.availableStock !== undefined && (
                            <Badge className={cn("text-[10px] font-bold", item.availableStock > 0 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-red-100 text-red-800 border-red-300")}>
                              Available Stock: {item.availableStock} PCS
                            </Badge>
                          )}
                          {Number(item.incentiveValue || item.incentiveAmount) > 0 && item.incentiveType !== "none" && (
                            <Badge className={cn(
                              "font-mono text-[10px] font-bold",
                              (Number(item.incentiveTargetAmount) <= 0 || (Number(item.rate) || 0) >= (Number(item.incentiveTargetAmount) || 0))
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-amber-50 text-amber-800 border-amber-300"
                            )}>
                              {(Number(item.incentiveTargetAmount) <= 0 || (Number(item.rate) || 0) >= (Number(item.incentiveTargetAmount) || 0))
                                ? (item.incentiveType === "percentage" 
                                    ? `🎁 Target Met: +${item.incentiveValue}% Inc` 
                                    : `🎁 Target Met: +₹${(Number(item.incentiveValue || item.incentiveAmount) || 0) * (Number(item.qty) || 1)} Inc`)
                                : `⚠️ Target: ₹${item.incentiveTargetAmount || 0} (₹0 Inc)`}
                            </Badge>
                          )}
                          {item.adminApprovedRate && (
                            <Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold">
                              ✅ Admin Approved Rate
                            </Badge>
                          )}
                        </div>
                        <button type="button" onClick={() => removeLineItem(idx)} className="text-red-500 hover:text-red-700 p-1 flex items-center gap-1 text-xs">
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        {/* PRODUCT SEARCH & AUTOCOMPLETE */}
                        <div className="md:col-span-3 relative">
                          <Label className="text-[11px] font-semibold text-slate-700">Product / Item Search *</Label>
                          <Input
                            placeholder="Type to search electronics/mobile catalog..."
                            value={item.name}
                            onChange={(e) => { handleLineItemChange(idx, "name", e.target.value); setActiveSuggestRow(idx); }}
                            onFocus={() => setActiveSuggestRow(idx)}
                            onBlur={() => setTimeout(() => setActiveSuggestRow(null), 300)}
                            className="h-8 text-xs bg-white border-slate-300 font-semibold"
                          />
                          {activeSuggestRow === idx && suggestions.length > 0 && (
                            <div className="absolute left-0 top-12 w-full bg-white border-2 border-[#3F63AD] shadow-2xl rounded-xl z-[9999] max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
                              <div className="px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-600 uppercase flex justify-between">
                                <span>Catalog Match ({suggestions.length} items)</span>
                                <span>Click to select</span>
                              </div>
                              {suggestions.map((prod: any, pIdx: number) => (
                                <div 
                                  key={pIdx} 
                                  onMouseDown={(e) => { e.preventDefault(); selectProductSuggestion(idx, prod); }} 
                                  className="p-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between rounded-lg"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#3F63AD]">{prod.category || "Electronics"}</span>
                                      <span className="text-[9px] font-mono font-bold text-slate-600">VP: {prod.vpCode || prod.code}</span>
                                      {(prod.currentStock || 0) <= 0 ? (
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-300">
                                          OUT OF STOCK
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          Stock: {prod.currentStock}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-bold text-slate-900 text-xs">{prod.name}</p>
                                  </div>
                                  <span className="font-black text-[#76C043] text-xs">{formatCurrency(prod.sellingPrice || prod.rate || 0)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* SERIAL NUMBER DROPDOWN */}
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[11px] font-semibold text-slate-700">Serial Number (In Store)</Label>
                            {matchingSerials.length > 0 && (
                              <span className="text-[9.5px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                                {matchingSerials.length} Available
                              </span>
                            )}
                          </div>
                          {matchingSerials.length > 0 ? (
                            <Select 
                              value={item.serialNumber || ""} 
                              onValueChange={(v) => handleLineItemChange(idx, "serialNumber", v)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white border-slate-300 font-mono font-bold text-[#3F63AD]">
                                <SelectValue placeholder="Select In-Store Serial #" />
                              </SelectTrigger>
                              <SelectContent>
                                {matchingSerials.map((s: any) => (
                                  <SelectItem key={s._id || s.serialNumber} value={s.serialNumber}>
                                    SN: {s.serialNumber} {s.batchNo ? `(Batch: ${s.batchNo})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              placeholder="e.g. 605PLTV314681" 
                              value={item.serialNumber || ""} 
                              onChange={(e) => handleLineItemChange(idx, "serialNumber", e.target.value)} 
                              className="h-8 text-xs bg-white border-slate-300 font-mono"
                            />
                          )}
                        </div>

                        {/* BATCH NUMBER (REQ 18) */}
                        <div className="md:col-span-1">
                          <Label className="text-[11px] font-semibold text-slate-700">Batch No.</Label>
                          <Input 
                            placeholder="Batch #" 
                            value={item.batchNumber} 
                            onChange={(e) => handleLineItemChange(idx, "batchNumber", e.target.value)} 
                            className="h-8 text-xs bg-white border-slate-300 font-mono"
                          />
                        </div>

                        {/* QTY */}
                        <div>
                          <Label className="text-[11px] font-semibold text-slate-700">Qty (Pcs)</Label>
                          <Input 
                            type="number" min="1" 
                            value={item.qty} 
                            onChange={(e) => handleLineItemChange(idx, "qty", Math.max(1, Number(e.target.value)))} 
                            className="h-8 text-xs bg-white border-slate-300 text-center font-bold"
                          />
                        </div>

                        {/* RATE */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[11px] font-semibold text-slate-700">Rate (₹)</Label>
                            {item.minSellingPrice > 0 && (
                              <span className="text-[8.5px] font-mono text-amber-800 bg-amber-50 px-1 rounded border border-amber-200" title={`Min Floor Price: ₹${item.minSellingPrice}`}>
                                Min: ₹{item.minSellingPrice}
                              </span>
                            )}
                          </div>
                          <Input 
                            type="number" min="0" 
                            value={item.rate === 0 ? "" : item.rate} 
                            onChange={(e) => handleRateChangeAttempt(idx, Math.max(0, Number(e.target.value)))} 
                            className={cn(
                              "h-8 text-xs bg-white border-slate-300 text-right font-semibold",
                              item.adminApprovedRate && "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold",
                              item.minSellingPrice > 0 && item.rate < item.minSellingPrice && !item.adminApprovedRate && "border-amber-500 bg-amber-50 text-amber-900"
                            )}
                          />
                        </div>

                        {/* DISCOUNT */}
                        <div>
                          <Label className="text-[11px] font-semibold text-slate-700">Disc (₹)</Label>
                          <Input 
                            type="number" min="0" 
                            value={item.discount === 0 ? "" : item.discount} 
                            onChange={(e) => handleLineItemChange(idx, "discount", Math.max(0, Number(e.target.value)))} 
                            className="h-8 text-xs bg-white border-slate-300 text-right font-semibold text-emerald-700"
                          />
                        </div>

                        {/* GST % */}
                        <div>
                          <Label className="text-[11px] font-semibold text-slate-700">GST Slab</Label>
                          <Select value={String(item.gstRate)} onValueChange={(v) => handleLineItemChange(idx, "gstRate", Number(v))}>
                            <SelectTrigger className="h-8 text-xs bg-white border-slate-300 font-semibold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18% (Standard)</SelectItem>
                              <SelectItem value="28">28% (Luxury)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* EXTENDED WARRANTY PLAN & CUSTOM DETAILS */}
                        <div className="md:col-span-6 bg-purple-50/60 p-3 rounded-xl border border-purple-200 space-y-2.5">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <Label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-purple-600" /> Extended Warranty & Device Protection
                            </Label>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-purple-700">Quick Plan:</span>
                              <Select 
                                value={WARRANTY_PLANS.find(p => p.name === item.extendedWarrantyPlan)?.id || (item.extendedWarrantyAmount > 0 ? "custom" : "none")} 
                                onValueChange={(v) => {
                                  if (v === "custom") {
                                    handleLineItemChange(idx, "extendedWarrantyProvider", "OneAssist");
                                    handleLineItemChange(idx, "extendedWarrantyDuration", 1);
                                    handleLineItemChange(idx, "extendedWarrantyAmount", 1499);
                                    handleLineItemChange(idx, "extendedWarrantyPlan", "Custom Extended Warranty");
                                  } else {
                                    handleLineItemChange(idx, "extendedWarrantyPlan", v);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs bg-white border-purple-300 font-bold text-purple-900 w-52">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {WARRANTY_PLANS.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} {p.price > 0 ? `(+₹${p.price.toLocaleString("en-IN")})` : ""}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom">⚙️ Custom Provider & Price</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {(item.extendedWarrantyAmount > 0 || (item.extendedWarrantyPlan && item.extendedWarrantyPlan !== "none")) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1.5 border-t border-purple-200/80">
                              <div>
                                <Label className="text-[10px] font-bold text-purple-900">Provider Name *</Label>
                                <Select 
                                  value={item.extendedWarrantyProvider || "OneAssist"} 
                                  onValueChange={(v) => handleLineItemChange(idx, "extendedWarrantyProvider", v)}
                                >
                                  <SelectTrigger className="h-7 text-xs bg-white border-purple-300 font-bold text-slate-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WARRANTY_PROVIDERS.map(pr => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-[10px] font-bold text-purple-900">Duration (Years) *</Label>
                                <Select 
                                  value={String(item.extendedWarrantyDuration || 1)} 
                                  onValueChange={(v) => handleLineItemChange(idx, "extendedWarrantyDuration", Number(v))}
                                >
                                  <SelectTrigger className="h-7 text-xs bg-white border-purple-300 font-bold text-slate-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WARRANTY_DURATIONS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-[10px] font-bold text-purple-900">Warranty Price (₹) *</Label>
                                <Input 
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 1999"
                                  value={item.extendedWarrantyAmount || ""}
                                  onChange={(e) => handleLineItemChange(idx, "extendedWarrantyAmount", Math.max(0, Number(e.target.value) || 0))}
                                  className="h-7 text-xs bg-white border-purple-300 font-mono font-black text-purple-950"
                                />
                              </div>

                              <div>
                                <Label className="text-[10px] font-bold text-purple-900">Policy / Certificate No.</Label>
                                <Input 
                                  placeholder="e.g. OA-99281"
                                  value={item.extendedWarrantyPolicyNo || ""}
                                  onChange={(e) => handleLineItemChange(idx, "extendedWarrantyPolicyNo", e.target.value)}
                                  className="h-7 text-xs bg-white border-purple-300 font-mono text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ROW TOTAL BAR */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                        <div className="text-slate-600 flex items-center gap-3">
                          <span>Taxable Value: <strong className="text-slate-800">{formatCurrency(lineTaxable)}</strong></span>
                          <span>GST Tax: <strong className="text-slate-800">{formatCurrency(lineGst)}</strong></span>
                          {warrantyAmt > 0 && (
                            <span className="text-purple-700 font-semibold">Warranty: +{formatCurrency(warrantyAmt)}</span>
                          )}
                        </div>
                        <div className="font-extrabold text-sm text-slate-900">
                          Row Total: <span className="text-[#3F63AD]">{formatCurrency(lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: DEDICATED PAYMENT MODES (CASH, UPI, ONLINE, CREDIT CARD + MDR, DEBIT CARD, FINANCE, DUE) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3F63AD] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#3F63AD]" /> 3. PAYMENT MODE SPECIFICATIONS & RECONCILIATION
                </h4>
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  {(["Cash", "UPI", "Credit Card", "Debit Card", "Online", "Finance", "Due / Credit"] as const).map((modeKey) => (
                    <button
                      key={modeKey}
                      type="button"
                      onClick={() => setBillingForm({ ...billingForm, paymentMode: modeKey })}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1",
                        billingForm.paymentMode === modeKey 
                          ? (modeKey === "Due / Credit" 
                              ? "bg-rose-600 text-white shadow-sm" 
                              : modeKey === "Credit Card" 
                              ? "bg-amber-600 text-white shadow-sm" 
                              : modeKey === "Debit Card" 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : "bg-[#3F63AD] text-white shadow-sm")
                          : "text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      {modeKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. CASH PAYMENT MODE */}
              {billingForm.paymentMode === "Cash" && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <Label className="font-bold text-emerald-950">Cash Amount Payable (₹)</Label>
                    <Input readOnly value={formatCurrency(billCalculations.grandTotal)} className="bg-white border-emerald-300 font-black text-emerald-800 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="font-bold text-emerald-950">Cash Received By</Label>
                    <Input value={billingForm.cashReceivedBy} onChange={(e) => setBillingForm({ ...billingForm, cashReceivedBy: e.target.value })} className="bg-white border-emerald-300 mt-1" />
                  </div>
                  <div>
                    <Label className="font-bold text-emerald-950">Remarks / Cash Drawer Notes</Label>
                    <Input placeholder="Counter collection" value={billingForm.cashRemarks} onChange={(e) => setBillingForm({ ...billingForm, cashRemarks: e.target.value })} className="bg-white border-emerald-300 mt-1" />
                  </div>
                </div>
              )}

              {/* 2. UPI PAYMENT MODE */}
              {billingForm.paymentMode === "UPI" && (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <Label className="font-bold text-blue-950">UPI Amount (₹)</Label>
                    <Input readOnly value={formatCurrency(billCalculations.grandTotal)} className="bg-white border-blue-300 font-black text-blue-800 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="font-bold text-blue-950">UPI Ref / UTR / Transaction ID *</Label>
                    <Input placeholder="e.g. 423985729103" value={billingForm.upiTxnId} onChange={(e) => setBillingForm({ ...billingForm, upiTxnId: e.target.value })} className="bg-white border-blue-300 font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="font-bold text-blue-950">Remarks</Label>
                    <Input placeholder="PhonePe / GPay / Paytm QR" value={billingForm.upiRemarks} onChange={(e) => setBillingForm({ ...billingForm, upiRemarks: e.target.value })} className="bg-white border-blue-300 mt-1" />
                  </div>
                </div>
              )}

              {/* 3. ONLINE PAYMENT MODE */}
              {billingForm.paymentMode === "Online" && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <Label className="font-bold text-indigo-950">Online Amount (₹)</Label>
                    <Input readOnly value={formatCurrency(billCalculations.grandTotal)} className="bg-white border-indigo-300 font-black text-indigo-800 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="font-bold text-indigo-950">Transaction ID *</Label>
                    <Input placeholder="TXN-9847192" value={billingForm.onlineTxnId} onChange={(e) => setBillingForm({ ...billingForm, onlineTxnId: e.target.value })} className="bg-white border-indigo-300 font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="font-bold text-indigo-950">Payment Gateway / Source</Label>
                    <Select value={billingForm.onlineGateway} onValueChange={(v) => setBillingForm({ ...billingForm, onlineGateway: v })}>
                      <SelectTrigger className="bg-white border-indigo-300 mt-1 font-semibold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Razorpay POS">Razorpay POS</SelectItem>
                        <SelectItem value="PineLabs Gateway">PineLabs Gateway</SelectItem>
                        <SelectItem value="HDFC SmartHub">HDFC SmartHub</SelectItem>
                        <SelectItem value="Direct NetBanking">Direct NetBanking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-bold text-indigo-950">Reference ID</Label>
                    <Input placeholder="Ref #" value={billingForm.onlineRefId} onChange={(e) => setBillingForm({ ...billingForm, onlineRefId: e.target.value })} className="bg-white border-indigo-300 mt-1" />
                  </div>
                </div>
              )}

              {/* 4A. CREDIT CARD PAYMENT MODE WITH ADMIN-CONFIGURABLE MDR */}
              {billingForm.paymentMode === "Credit Card" && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-300 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-200 pb-2.5 gap-2">
                    <div>
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-amber-700" /> Credit Card EDC Swipe & MDR Surcharge Configuration
                      </span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Merchant Discount Rate (MDR) deduction. Admin can choose preset or custom MDR %.
                      </p>
                    </div>

                    {/* ADMIN MDR QUICK PRESETS */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-amber-900 uppercase">Admin MDR:</span>
                      {[
                        { label: "0% (Free)", val: 0 },
                        { label: "1.5% Standard", val: 1.5 },
                        { label: "1.8% RuPay/Visa", val: 1.8 },
                        { label: "2.0% Default", val: 2.0 },
                        { label: "2.5% Corp/Amex", val: 2.5 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setBillingForm({ ...billingForm, creditCardMdrPercent: preset.val })}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold transition-colors border",
                            Number(billingForm.creditCardMdrPercent) === preset.val
                              ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                              : "bg-white text-amber-950 border-amber-300 hover:bg-amber-100"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div>
                      <Label className="font-bold text-amber-950">Card Swiped Amount (₹)</Label>
                      <Input readOnly value={formatCurrency(billCalculations.grandTotal)} className="bg-white border-amber-300 font-black text-slate-900 mt-1 h-8" />
                    </div>
                    <div>
                      <Label className="font-bold text-amber-950">EDC POS Swiper Machine</Label>
                      <Select 
                        value={billingForm.creditCardType} 
                        onValueChange={(v) => setBillingForm({ ...billingForm, creditCardType: v })}
                      >
                        <SelectTrigger className="bg-white border-amber-300 mt-1 font-semibold h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HDFC POS EDC">HDFC POS EDC Machine</SelectItem>
                          <SelectItem value="ICICI Merchant EDC">ICICI Merchant EDC</SelectItem>
                          <SelectItem value="SBI Card POS">SBI Card EDC Terminal</SelectItem>
                          <SelectItem value="Axis Bank EDC">Axis Bank EDC Machine</SelectItem>
                          <SelectItem value="PineLabs Smart POS">PineLabs Smart POS</SelectItem>
                          <SelectItem value="American Express EDC">Amex EDC Terminal</SelectItem>
                          <SelectItem value="Other POS Machine">Other POS Machine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-bold text-amber-950">Txn / RRN / Approval Code *</Label>
                      <Input 
                        placeholder="e.g. RRN 49201938" 
                        value={billingForm.creditCardTxnId} 
                        onChange={(e) => setBillingForm({ ...billingForm, creditCardTxnId: e.target.value })} 
                        className="bg-white border-amber-300 font-mono mt-1 h-8" 
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-amber-950">Card Last 4 Digits</Label>
                      <Input 
                        maxLength={4}
                        placeholder="e.g. 4812" 
                        value={billingForm.creditCardLast4} 
                        onChange={(e) => setBillingForm({ ...billingForm, creditCardLast4: e.target.value.replace(/\D/g, '') })} 
                        className="bg-white border-amber-300 font-mono font-bold mt-1 h-8" 
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-amber-950">Custom MDR %</Label>
                        <span className="text-[10px] text-amber-700 font-semibold">(Admin Rate)</span>
                      </div>
                      <Input 
                        type="number" step="0.1" min="0" max="10" 
                        value={billingForm.creditCardMdrPercent} 
                        onChange={(e) => setBillingForm({ ...billingForm, creditCardMdrPercent: Math.max(0, Number(e.target.value) || 0) })} 
                        className="bg-white border-amber-300 font-bold text-amber-950 mt-1 h-8" 
                      />
                    </div>
                  </div>

                  <div className="bg-amber-100/70 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-950 flex flex-wrap items-center justify-between gap-2">
                    <span>Card Invoice Total: <strong className="text-slate-900">{formatCurrency(billCalculations.grandTotal)}</strong></span>
                    <span>Bank MDR Deducted: <strong className="text-red-700">-{formatCurrency(billCalculations.cardMdrAmount)} ({billingForm.creditCardMdrPercent}%)</strong></span>
                    <span>Net Expected Bank Settlement: <strong className="text-emerald-800 text-xs font-black">{formatCurrency(billCalculations.cardNetSettlement)}</strong></span>
                  </div>
                </div>
              )}

              {/* 4B. DEBIT CARD PAYMENT MODE */}
              {billingForm.paymentMode === "Debit Card" && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-300 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2.5">
                    <div>
                      <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-700" /> Debit Card POS Swipe (ATM / RuPay / Visa / Master Debit)
                      </span>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Standard retail debit card transaction (Zero / Minimal MDR rate applicable).
                      </p>
                    </div>
                    <Badge className="bg-blue-600 text-white font-bold text-[10px]">DEBIT CARD POS</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div>
                      <Label className="font-bold text-blue-950">Debit Card Amount (₹)</Label>
                      <Input readOnly value={formatCurrency(billCalculations.grandTotal)} className="bg-white border-blue-300 font-black text-slate-900 mt-1 h-8" />
                    </div>
                    <div>
                      <Label className="font-bold text-blue-950">EDC POS Swiper Machine</Label>
                      <Select 
                        value={billingForm.debitCardType} 
                        onValueChange={(v) => setBillingForm({ ...billingForm, debitCardType: v })}
                      >
                        <SelectTrigger className="bg-white border-blue-300 mt-1 font-semibold h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HDFC POS EDC">HDFC POS EDC Machine</SelectItem>
                          <SelectItem value="ICICI Merchant EDC">ICICI Merchant EDC</SelectItem>
                          <SelectItem value="SBI Card POS">SBI Card EDC Terminal</SelectItem>
                          <SelectItem value="Axis Bank EDC">Axis Bank EDC Machine</SelectItem>
                          <SelectItem value="PineLabs Smart POS">PineLabs Smart POS</SelectItem>
                          <SelectItem value="Other POS Machine">Other POS Machine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-bold text-blue-950">Txn / RRN / Approval Code *</Label>
                      <Input 
                        placeholder="e.g. RRN 59102938" 
                        value={billingForm.debitCardTxnId} 
                        onChange={(e) => setBillingForm({ ...billingForm, debitCardTxnId: e.target.value })} 
                        className="bg-white border-blue-300 font-mono mt-1 h-8" 
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-blue-950">Card Last 4 Digits</Label>
                      <Input 
                        maxLength={4}
                        placeholder="e.g. 1029" 
                        value={billingForm.debitCardLast4} 
                        onChange={(e) => setBillingForm({ ...billingForm, debitCardLast4: e.target.value.replace(/\D/g, '') })} 
                        className="bg-white border-blue-300 font-mono font-bold mt-1 h-8" 
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-blue-950">MDR %</Label>
                        <span className="text-[10px] text-emerald-700 font-bold">(0% Standard)</span>
                      </div>
                      <Input 
                        type="number" step="0.1" min="0" max="5" 
                        value={billingForm.debitCardMdrPercent} 
                        onChange={(e) => setBillingForm({ ...billingForm, debitCardMdrPercent: Math.max(0, Number(e.target.value) || 0) })} 
                        className="bg-white border-blue-300 font-bold text-blue-950 mt-1 h-8" 
                      />
                    </div>
                  </div>

                  <div className="bg-blue-100/70 p-2.5 rounded-lg border border-blue-200 text-[11px] text-blue-950 flex flex-wrap items-center justify-between gap-2">
                    <span>Debit Card Total: <strong className="text-slate-900">{formatCurrency(billCalculations.grandTotal)}</strong></span>
                    <span>Bank MDR: <strong className={billingForm.debitCardMdrPercent > 0 ? "text-red-700" : "text-emerald-700"}>{billingForm.debitCardMdrPercent > 0 ? `-${formatCurrency(billCalculations.cardMdrAmount)} (${billingForm.debitCardMdrPercent}%)` : "₹0.00 (0% Zero MDR)"}</strong></span>
                    <span>Net Settlement: <strong className="text-emerald-800 text-xs font-black">{formatCurrency(billCalculations.cardNetSettlement)}</strong></span>
                  </div>
                </div>
              )}

              {/* 5. FINANCE PAYMENT MODE */}
              {billingForm.paymentMode === "Finance" && (
                <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-orange-200 pb-2">
                    <span className="text-xs font-black text-orange-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" /> Finance Provider, Down Payment & DO Details
                    </span>
                    <Badge className="bg-orange-600 text-white font-bold text-[10px]">FINANCE SALE WORKFLOW</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <Label className="font-bold text-orange-950">Finance Provider *</Label>
                      <Select value={billingForm.financeProvider} onValueChange={(v) => setBillingForm({ ...billingForm, financeProvider: v })}>
                        <SelectTrigger className="bg-white border-orange-300 font-bold text-orange-900 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bajaj Finance Limited">Bajaj Finance Limited</SelectItem>
                          <SelectItem value="HDB Financial Services">HDB Financial Services</SelectItem>
                          <SelectItem value="IDFC First Bank">IDFC First Bank</SelectItem>
                          <SelectItem value="TVS Credit">TVS Credit</SelectItem>
                          <SelectItem value="Kotak Mahindra Prime">Kotak Mahindra Prime</SelectItem>
                          <SelectItem value="Home Credit India">Home Credit India</SelectItem>
                          <SelectItem value="Other Finance">Other Finance Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-bold text-orange-950">Finance DO / Sanction ID *</Label>
                      <Input placeholder="e.g. B432262868" value={billingForm.financeDoId} onChange={(e) => setBillingForm({ ...billingForm, financeDoId: e.target.value })} className="bg-white border-orange-300 font-mono font-bold mt-1" />
                    </div>
                    <div>
                      <Label className="font-bold text-orange-950">Application / Deal ID</Label>
                      <Input placeholder="e.g. CS289666676227" value={billingForm.financeAppId} onChange={(e) => setBillingForm({ ...billingForm, financeAppId: e.target.value })} className="bg-white border-orange-300 font-mono mt-1" />
                    </div>
                    <div>
                      <Label className="font-bold text-orange-950">Customer Down Payment (₹)</Label>
                      <Input 
                        type="number" min="0" 
                        value={billingForm.financeDownPayment || ""} 
                        onChange={(e) => setBillingForm({ ...billingForm, financeDownPayment: Math.max(0, Number(e.target.value)) })} 
                        className="bg-white border-orange-300 font-bold text-emerald-800 mt-1" 
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-orange-950">Down Payment Mode *</Label>
                      <Select 
                        value={billingForm.financeDownPaymentMode || "Cash"} 
                        onValueChange={(v) => setBillingForm({ ...billingForm, financeDownPaymentMode: v })}
                      >
                        <SelectTrigger className="bg-white border-orange-300 font-bold text-slate-800 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash at Counter</SelectItem>
                          <SelectItem value="UPI">UPI / QR Code</SelectItem>
                          <SelectItem value="Card">Debit / Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-bold text-orange-950">Gross Sanctioned Loan (₹)</Label>
                      <Input readOnly value={formatCurrency(Math.max(0, billCalculations.grandTotal - Number(billingForm.financeDownPayment || 0)))} className="bg-orange-100/70 border-orange-300 font-black text-orange-950 mt-1" />
                    </div>
                    <div>
                      <Label className="font-bold text-orange-950">Approval Status</Label>
                      <Select value={billingForm.financeApprovalStatus} onValueChange={(v: any) => setBillingForm({ ...billingForm, financeApprovalStatus: v })}>
                        <SelectTrigger className="bg-white border-orange-300 font-bold text-slate-800 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Disbursed">Disbursed</SelectItem>
                          <SelectItem value="Reconciled">Reconciled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-bold text-orange-950">DO / Approval Attachment Link</Label>
                      <Input placeholder="Attachment link or scan ref" value={billingForm.financePdfUrl} onChange={(e) => setBillingForm({ ...billingForm, financePdfUrl: e.target.value })} className="bg-white border-orange-300 mt-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* 6. DUE / CREDIT BILL MODE */}
              {billingForm.paymentMode === "Due / Credit" && (
                <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                    <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-600" /> Due / Credit Sale (Udhar Khata & Promise Date)
                    </span>
                    <Badge className="bg-rose-600 text-white font-bold text-[10px]">PENDING BALANCE BILL</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="font-bold text-rose-950">Total Bill Amount (₹)</Label>
                      <Input readOnly value={formatCurrency(billCalculations.grandTotal)} className="bg-white border-rose-300 font-black text-slate-900 mt-1" />
                    </div>
                    <div>
                      <Label className="font-bold text-rose-950">Advance Received (₹)</Label>
                      <Input 
                        type="number" min="0" max={billCalculations.grandTotal}
                        value={billingForm.advanceAmount || ""} 
                        onChange={(e) => setBillingForm({ ...billingForm, advanceAmount: Math.max(0, Number(e.target.value)) })} 
                        placeholder="0.00"
                        className="bg-white border-rose-300 font-bold text-emerald-800 mt-1" 
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-rose-950">Advance Payment Mode</Label>
                      <Select 
                        value={billingForm.dueAdvanceMode || "Cash"} 
                        onValueChange={(v) => setBillingForm({ ...billingForm, dueAdvanceMode: v })}
                      >
                        <SelectTrigger className="bg-white border-rose-300 font-bold text-slate-800 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-bold text-rose-950">Remaining Due Balance (₹)</Label>
                      <Input 
                        readOnly 
                        value={formatCurrency(Math.max(0, billCalculations.grandTotal - (Number(billingForm.advanceAmount) || 0)))} 
                        className="bg-rose-100/80 border-rose-300 font-black text-rose-700 mt-1" 
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-rose-950 text-rose-900">Promised Due Date (Kab tak jama karega) *</Label>
                      <Input 
                        type="date" 
                        value={billingForm.dueDate || ""} 
                        onChange={(e) => setBillingForm({ ...billingForm, dueDate: e.target.value })} 
                        className="bg-white border-rose-300 font-bold text-rose-950 mt-1" 
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-bold text-rose-950">Customer Promise / Udhar Notes</Label>
                    <Input 
                      placeholder="e.g. Promised to pay balance via cash/UPI by next Friday" 
                      value={billingForm.dueRemarks || ""} 
                      onChange={(e) => setBillingForm({ ...billingForm, dueRemarks: e.target.value })} 
                      className="bg-white border-rose-300 mt-1" 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: PAYMENT SUMMARY & TOTALS (REQ 13) */}
            <div className="bg-[#1B2537] text-white p-5 rounded-xl border border-slate-800 shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="space-y-1 text-xs">
                <p className="text-slate-300">Total Items: <span className="font-bold text-white">{billingForm.lineItems.length} Products</span></p>
                <p className="text-slate-300">Taxable Amount: <span className="font-bold text-white">{formatCurrency(billCalculations.totalTaxable)}</span></p>
                <p className="text-slate-300">CGST + SGST: <span className="font-bold text-[#76C043]">{formatCurrency(billCalculations.cgst + billCalculations.sgst)}</span></p>
              </div>

              <div className="space-y-1 text-xs">
                {billCalculations.warrantyTotal > 0 && (
                  <p className="text-purple-300">Extended Warranty: <span className="font-bold text-purple-200">+{formatCurrency(billCalculations.warrantyTotal)}</span></p>
                )}
                {billCalculations.freight > 0 && (
                  <p className="text-emerald-300">Freight / Delivery: <span className="font-bold text-emerald-200">+{formatCurrency(billCalculations.freight)}</span></p>
                )}
                {billingForm.paymentMode === "Card" && (
                  <p className="text-amber-300">MDR Deducted: <span className="font-bold text-amber-200">-{formatCurrency(billCalculations.cardMdrAmount)}</span></p>
                )}
                <p className="text-slate-300">Round Off: <span className="font-bold text-white">{billCalculations.roundOff > 0 ? `+₹${billCalculations.roundOff}` : `₹${billCalculations.roundOff}`}</span></p>
                <p className="text-slate-300">Payment Mode: <span className="font-bold uppercase text-[#76C043]">{billingForm.paymentMode}</span></p>
              </div>

              <div className="space-y-1.5 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Salesperson Commission</p>
                <p className="font-bold text-white text-xs truncate">{billingForm.salesExecutive || "Counter Staff"}</p>
                <p className="text-emerald-400 font-mono font-bold text-xs mt-0.5 flex items-center gap-1">
                  <span>🎁 Earned Incentive:</span>
                  <span>+{formatCurrency(billCalculations.totalIncentive)}</span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Net Amount Payable</p>
                <p className="text-3xl font-black text-[#76C043] tracking-tight">{formatCurrency(billCalculations.grandTotal)}</p>
                {billingForm.paymentMode === "Finance" && (
                  <p className="text-xs text-orange-300 font-bold mt-1">
                    Down Pay: {formatCurrency(billingForm.financeDownPayment)} • Loan: {formatCurrency(Math.max(0, billCalculations.grandTotal - Number(billingForm.financeDownPayment)))}
                  </p>
                )}
                {billingForm.paymentMode === "Due / Credit" && (
                  <p className="text-xs text-rose-300 font-bold mt-1">
                    Paid: {formatCurrency(billingForm.advanceAmount || 0)} • Due: {formatCurrency(Math.max(0, billCalculations.grandTotal - Number(billingForm.advanceAmount || 0)))}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="bg-slate-100 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                * Generates commercial Value Plus Tax Invoice matching official layout with dynamic multi-page rendering
              </span>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose} className="text-slate-600">Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={createInvoiceMutation.isPending || (mode === "invoice" && isIndividualStaff)} 
                  className={cn(
                    "font-bold px-6 shadow-lg shadow-blue-900/20",
                    mode === "invoice" && isIndividualStaff 
                      ? "bg-slate-400 cursor-not-allowed text-white" 
                      : "bg-[#3F63AD] hover:bg-[#2E4F95] text-white"
                  )}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {mode === "estimate" 
                    ? "Generate Estimate" 
                    : mode === "credit-note" 
                    ? "Issue Credit Note" 
                    : (isIndividualStaff ? "Restricted: Cashier Only" : "Finalize & Generate Invoice")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Admin PIN Authorization Dialog (Floor Price Override) ─── */}
      <Dialog open={!!pinPrompt} onOpenChange={(open) => { if (!open) setPinPrompt(null); }}>
        <DialogContent className="max-w-md p-0 rounded-2xl border-none shadow-2xl overflow-hidden bg-white z-[99999]">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Admin Price Override PIN</h3>
              <p className="text-xs text-amber-100">Supervisor approval required to sell below floor price</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs space-y-1.5">
              <p className="font-bold text-amber-950 line-clamp-1">{pinPrompt?.itemName}</p>
              <div className="flex justify-between text-amber-900 pt-1 border-t border-amber-200">
                <span>Minimum Allowed Floor Price:</span>
                <span className="font-mono font-bold">{formatCurrency(pinPrompt?.minPrice || 0)}</span>
              </div>
              <div className="flex justify-between text-red-700 font-bold">
                <span>Attempted Selling Rate:</span>
                <span className="font-mono">{formatCurrency(pinPrompt?.proposedRate || 0)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Enter Admin 4-Digit Security PIN *</Label>
              <Input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleVerifyAdminPin();
                  }
                }}
                className={cn(
                  "text-center text-2xl tracking-[0.5em] font-mono h-12 font-black border-2",
                  pinError ? "border-red-500 bg-red-50" : "border-amber-400 bg-slate-50"
                )}
              />
              {pinError ? (
                <p className="text-xs text-red-600 font-semibold text-center">Incorrect PIN! Supervisor authorization failed.</p>
              ) : (
                <p className="text-[11px] text-slate-500 text-center">Default supervisor PIN is <strong className="font-mono text-slate-700">1234</strong></p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPinPrompt(null)}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleVerifyAdminPin}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Authorize Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AUTO-POPUP OFFICIAL TAX INVOICE PREVIEW & PRINT AFTER BILLING */}
      {generatedInvoiceToPrint && (
        <Dialog open={!!generatedInvoiceToPrint} onOpenChange={() => { setGeneratedInvoiceToPrint(null); onClose(); }}>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-2">
            <ValueplusInvoice 
              invoiceData={generatedInvoiceToPrint} 
              onBack={() => { setGeneratedInvoiceToPrint(null); onClose(); }} 
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
