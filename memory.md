# Developer Memory & Notes

## 1. Sidebar Configuration & Navigation
- **Showroom Identity**: M/S ASHOKA ENTERPRISES (Value Plus Showroom), H. No. 116, Deoria Rd, Kunraghat, Gorakhpur (09), GSTIN: `09ANHPJ7242D1Z2`, Phone: `9140860604`.
- **Navigation Groups**: Located in `constants/navigation.ts`.
- **Hidden Modules**: `Banking`, `Accounting`, and `Marketing` are currently hidden from the sidebar navigation.
- **How to Unhide**: To restore them, open `constants/navigation.ts` and remove the `/* ... */` block comments surrounding their entries in the `NAV_GROUPS` array.

---

## 2. Dashboard Universal Filter & Data Sync
- **File**: `app/(dashboard)/dashboard/page.tsx`.
- **Universal Filter**: Handled by `handleUniversalFilterChange(val, customStart, customEnd)` which:
  1. Resolves start/end dates via `resolveDateRange()`.
  2. Updates `dateFilter`, `startDate`, `endDate`, and all `widgetFilters`.
  3. Invokes `loadAllDashboardData(s, e, val)`.
- **Offline-First Hydration**: `hydrateFromCache(s, e)` instantly renders from localStorage if cache exists for the requested date key. Avoid fallback to "Today" to prevent race condition overwrites when choosing past date presets.

---

## 3. Stock 4 Master Data & Direct Brand Products Catalog Navigation
- **Source File**: `Stock4_Cleaned_Brand_Model_Extraction.json`.
- **Direct Brand Products Catalog Navigation (`/masters/brands`)**:
  - Clicking any brand card immediately opens that brand's full product catalog with live inventory and pricing.
  - Features Category filter pills (`All Products`, `Air Conditioners`, `Refrigerators & Freezers`, `Televisions`, etc.) right on the page for instant sub-filtering.
  - Features stock filters (`In Stock`, `Low Stock`, `All`) and instant keyword search.
  - Table displays Product Name, VP Code, SKU, Category, HSN, GST %, Purchase Rate, Showroom Selling Price, MRP, Live Stock.
  - **"Bill Now" Direct Action**: 1-click opens the full `InvoiceCreationModal` directly inside the brand view so staff/admin can generate GST tax invoices, record customer details, finance/payment modes, and print bills on the spot.
  - Fixed badge spacing & padding (`gap-1.5`, `min-w-[280px]`) eliminating any text squishing or overlapping.
- **Official Brand Logos (Vector SVG Engine)**:
  - Implemented via `components/shared/brand-logo.tsx` (`BrandLogo` component).
  - Standalone, crisp SVG vector emblems and official wordmarks for all 27 showroom partner brands (`SAMSUNG`, `LG`, `DAIKIN`, `VOLTAS`, `VOLTASBEKO`, `HAVELLS`, `WHIRLPOOL`, `HAIER`, `LLOYD`, `BAJAJ`, `CARRIER`, `AISEN`, `PANASONIC`, `EUREKA FORBES`, `FABER`, `JBL`, `LUMINOUS`, `MAHARAJA WHITELINE`, `OPPO`, `REALME`, `VIVO`, `V-GUARD`, `SUNFLAME`, `TCL`, `SAFESTAB`, `HAPIPOLA`, `KRATOS`, etc.).
  - 100% offline-ready, 0ms load time, zero broken image icons.
- **Alphabetical Sorting (A-Z)**:
  - `app/api/brands/route.ts` sorts brands alphabetically using `.collation({ locale: "en", strength: 2 }).sort({ name: 1 })`.
  - Master pages and dropdown selectors render brands in strict A to Z alphabetical order (AISEN ➡️ BAJAJ ➡️ CARRIER ... ➡️ WHIRLPOOL).
- **Core Entities Synchronized**:
  1. **Items**: 350 valid active products with clean `VP-...` item codes, model numbers, HSN codes, GST rates, purchase prices, selling prices, MRPs, opening stocks, and current stocks.
  2. **Brands**: 27 active showroom partner brands.
  3. **Categories**: 9 intelligent consumer electronics categories.
  4. **Stock In & Out Ledger**: Date-stamped inward purchase entries (`VP-INW-2026-...`) & stock journals created with suppliers, inward quantities, and rates for seamless tracking on `/inventory/stock-flow`.

---

## 4. Admin & Staff Task Delegation System
- **Model**: `models/StaffTask.ts`.
- **API**: `app/api/staff/tasks/route.ts` (GET, POST, PUT, DELETE).
- **Dedicated Page**: `app/(dashboard)/staff/tasks/page.tsx`.
- **Core Features**:
  - Tasks can be assigned to **Admin (Self)** or any **Staff Member** (e.g., Amit Singh, Rahul Verma, Priya Sharma, etc.).
  - Priority levels: `Low`, `Medium`, `High`, `Urgent`.
  - Status lifecycle: `Pending` ➡️ `In Progress` ➡️ `Completed`.
  - 1-click completion toggle and quick task modal integrated both on dashboard and detailed hub.

---

## 5. Lead Pipeline & Automated Customer Conversion Engine
- **Model**: `models/Lead.ts`.
- **API**: `app/api/crm/leads/route.ts` (GET, POST, PUT, DELETE).
- **Dedicated Page**: `app/(dashboard)/marketing/leads/page.tsx`.
- **Automated Purchase Conversion**:
  - Whenever an invoice is generated via `app/api/invoices/route.ts`, the backend matches customer phone/name against active leads.
  - Automatically updates matching Lead status to `Converted`, records `convertedInvoiceNumber`, and pushes an audit timeline entry.

---

## 6. Product Floor Price (Admin PIN) & Target-Based Salesperson Incentive System
- **Product Floor Price (`minSellingPrice`)**:
  - Configurable per item on `/masters/items`.
  - Stored in MongoDB `Item.ts` (`minSellingPrice`).
  - During billing (`InvoiceCreationModal.tsx`), entering a price lower than `minSellingPrice` requires the Supervisor Admin PIN (`1234`).
  - Once verified, the special price is unlocked and marked as `adminApprovedRate: true`.
- **Target-Based Salesperson Incentive (Fixed ₹ / Percentage %)**:
  - Configured per product: `incentiveTargetAmount` (Target Selling Rate), `incentiveType` (`fixed` | `percentage` | `none`), and `incentiveValue`.
  - When salesperson sells at or above the target rate (`rate >= incentiveTargetAmount`):
    - **Fixed ₹**: `incentiveValue * quantity` (e.g. ₹500/piece)
    - **Percentage %**: `taxableAmount * (incentiveValue / 100)` (e.g. 2% or 5% of sale)
  - If sold below target rate (discounted), incentive is ₹0.
- **Salesperson Incentive Ledger (`/staff/incentives`)**:
  - Live commission leaderboard of all sales executives.
  - Invoice-level commission ledger and CSV export.
