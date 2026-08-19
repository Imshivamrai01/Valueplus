import {
  LayoutDashboard,
  Package,
  Tag,
  Award,
  Ruler,
  Layers,
  Warehouse,
  Users,
  Truck,
  FileText,
  ShoppingCart,
  PackageCheck,
  Receipt,
  CreditCard,
  FileMinus,
  ShoppingBag,
  ClipboardList,
  FileX,
  DollarSign,
  BarChart2,
  ArrowLeftRight,
  BookOpen,
  RefreshCw,
  RotateCcw,
  Percent,
  BarChart,
  UserCheck,
  CheckSquare,
  Sparkles,
  ClipboardCheck,
  AlertTriangle,
  BadgePercent,
  Clock,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Masters",
    items: [
      { title: "Items (VP Code)", href: "/masters/items", icon: Package },
      { title: "Categories", href: "/masters/categories", icon: Tag },
      { title: "Brands", href: "/masters/brands", icon: Award },
      { title: "Units", href: "/masters/units", icon: Ruler },
      { title: "Warehouses", href: "/masters/warehouses", icon: Warehouse },
      { title: "Customers", href: "/masters/customers", icon: Users },
      { title: "Suppliers", href: "/masters/suppliers", icon: Truck },
    ],
  },
  {
    title: "Sales & Billing",
    items: [
      { title: "Tax Invoices", href: "/sales/invoices", icon: Receipt },
      { title: "Delivery Challan", href: "/sales/challan", icon: PackageCheck },
      { title: "Finance Ledger", href: "/sales/finance-do", icon: Sparkles },
      { title: "E-Way Bills", href: "/sales/eway-bill", icon: Truck },
      { title: "Receive Payment", href: "/sales/payments", icon: CreditCard },
      { title: "Credit Notes", href: "/sales/credit-notes", icon: FileMinus },
      { title: "Estimates", href: "/sales/estimates", icon: FileText },
      { title: "Sales Orders", href: "/sales/orders", icon: ShoppingCart },
    ],
  },
  {
    title: "CRM & Enquiries",
    items: [
      { title: "Walk-in Queries", href: "/marketing/walk-in", icon: Users },
      { title: "Sales Leads", href: "/marketing/leads", icon: Sparkles },
    ],
  },
  {
    title: "Staff & Operations",
    items: [
      { title: "Staff Tasks", href: "/staff/tasks", icon: CheckSquare },
      { title: "Daily Attendance", href: "/staff/attendance", icon: UserCheck },
      { title: "Salary & Payroll", href: "/staff/salary", icon: DollarSign },
    ],
  },
  {
    title: "Inventory & Audit",
    items: [
      { title: "Stock Flow (In/Out)", href: "/inventory/stock-flow", icon: ArrowLeftRight },
      { title: "Daily Audit", href: "/inventory/audit", icon: ClipboardCheck },
      { title: "Stock Discrepancy", href: "/inventory/discrepancies", icon: AlertTriangle },
      { title: "Stock Adjustment", href: "/inventory/adjustment", icon: BarChart2 },
      { title: "Stock Transfer", href: "/inventory/transfer", icon: ArrowLeftRight },
      { title: "Stock Journal", href: "/inventory/journal", icon: BookOpen },
    ],
  },
  {
    title: "Purchase",
    items: [
      { title: "Purchase Orders", href: "/purchase/orders", icon: ShoppingBag },
      { title: "Purchase Entry", href: "/purchase/entries", icon: ClipboardList },
      { title: "Debit Notes", href: "/purchase/debit-notes", icon: FileX },
      { title: "Expenses", href: "/purchase/expenses", icon: DollarSign },
    ],
  },
  {
    title: "Reports & GST",
    items: [
      { title: "Sales Out Report", href: "/reports/sales-out", icon: Receipt },
      { title: "All Reports", href: "/reports", icon: BarChart },
      { title: "GST Reports", href: "/gst/reports", icon: Percent },
    ],
  },
];

export const COMPANY_NAME = "M/S ASHOKA ENTERPRISES (VALUE PLUS)";
export const COMPANY_GSTIN = "09ANHPJ7242D1Z2";
export const COMPANY_PAN = "ANHPJ7242D";
export const COMPANY_ADDRESS = "H. NO. 116, NEAR SHANTI MARRIAGE HOUSE DEORIA ROAD, KUNRAGHAT GORAKHPUR";
export const COMPANY_PHONE = "9140860604";
export const CURRENCY = "INR";
export const CURRENCY_SYMBOL = "₹";

export const GST_RATES = [0, 5, 12, 18, 28];

export const INDIAN_STATES = [
  "Uttar Pradesh", "Delhi", "Bihar", "Madhya Pradesh", "Maharashtra",
  "Rajasthan", "Haryana", "Punjab", "West Bengal", "Gujarat",
  "Uttarakhand", "Jharkhand", "Chhattisgarh", "Karnataka", "Tamil Nadu",
];

export const PAYMENT_MODES = ["Cash", "UPI", "Online", "Card", "Finance"] as const;

