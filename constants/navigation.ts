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
  Hammer,
  Percent,
  BarChart,
  Settings,
  UserCog,
  Building,
  User,
  Bot,
  Sparkles,
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
      { title: "Items", href: "/masters/items", icon: Package },
      { title: "Categories", href: "/masters/categories", icon: Tag },
      { title: "Brands", href: "/masters/brands", icon: Award },
      { title: "Units", href: "/masters/units", icon: Ruler },
      { title: "Variants", href: "/masters/variants", icon: Layers },
      { title: "Warehouses", href: "/masters/warehouses", icon: Warehouse },
      { title: "Customers", href: "/masters/customers", icon: Users },
      { title: "Suppliers", href: "/masters/suppliers", icon: Truck },
    ],
  },
  {
    title: "Sales",
    items: [
      { title: "Estimates", href: "/sales/estimates", icon: FileText },
      { title: "Sales Orders", href: "/sales/orders", icon: ShoppingCart },
      { title: "Delivery Challan", href: "/sales/challan", icon: PackageCheck },
      { title: "Invoices", href: "/sales/invoices", icon: Receipt },
      { title: "Receive Payment", href: "/sales/payments", icon: CreditCard },
      { title: "Credit Notes", href: "/sales/credit-notes", icon: FileMinus },
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
    title: "Inventory",
    items: [
      { title: "Stock Adjustment", href: "/inventory/adjustment", icon: BarChart2 },
      { title: "Stock Transfer", href: "/inventory/transfer", icon: ArrowLeftRight },
      { title: "Stock Journal", href: "/inventory/journal", icon: BookOpen },
      { title: "Stock Request", href: "/inventory/request", icon: RefreshCw },
      { title: "Stock Return", href: "/inventory/return", icon: RotateCcw },
      { title: "Bill of Material", href: "/inventory/bom", icon: Hammer },
    ],
  },
  /* {
    title: "Banking",
    items: [
      { title: "Receipts", href: "/banking/receipts", icon: ArrowDownToLine },
      { title: "Payments", href: "/banking/payments", icon: ArrowUpFromLine },
      { title: "Bank Accounts", href: "/banking/accounts", icon: Building2 },
    ],
  },
  {
    title: "Accounting",
    items: [
      { title: "Journal Entries", href: "/accounting/journal", icon: BookMarked },
      { title: "General Ledger", href: "/accounting/ledger", icon: BookOpen },
      { title: "Trial Balance", href: "/accounting/trial-balance", icon: Scale },
      { title: "Profit & Loss", href: "/accounting/profit-loss", icon: TrendingUp },
      { title: "Balance Sheet", href: "/accounting/balance-sheet", icon: AreaChart },
      { title: "Cash Flow", href: "/accounting/cash-flow", icon: Banknote },
    ],
  }, */
  {
    title: "GST",
    items: [
      { title: "GST Reports", href: "/gst/reports", icon: Percent },
    ],
  },
  /* {
    title: "Marketing",
    items: [
      { title: "Loyalty", href: "/marketing/loyalty", icon: Gift },
      { title: "WhatsApp", href: "/marketing/whatsapp", icon: MessageSquare },
    ],
  }, */
  {
    title: "Reports",
    items: [
      { title: "Reports", href: "/reports", icon: BarChart },
    ],
  },
  {
    title: "AI Features",
    items: [
      { title: "AI Insights", href: "/ai/insights", icon: Sparkles, badge: 1 },
      { title: "ValuePlus Assistant", href: "/ai/assistant", icon: Bot },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Users", href: "/settings/users", icon: UserCog },
      { title: "Company", href: "/settings/company", icon: Building },
      { title: "Profile", href: "/settings/profile", icon: User },
    ],
  },
];

export const COMPANY_NAME = "ValuePlus Trading Co. Pvt. Ltd.";
export const COMPANY_GSTIN = "27AABCV1234A1Z5";
export const CURRENCY = "INR";
export const CURRENCY_SYMBOL = "₹";

export const GST_RATES = [0, 5, 12, 18, 28];

export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Chandigarh",
];

export const PAYMENT_MODES = ["cash","bank-transfer","cheque","upi","card"] as const;
