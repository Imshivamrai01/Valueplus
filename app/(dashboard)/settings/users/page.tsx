"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  Warehouse,
  Store,
  Phone,
  Mail,
  Lock,
  DollarSign,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Search,
  Edit2,
  Trash2,
  Eye,
  Camera,
  Coins,
  BadgePercent,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { TableShimmer } from "@/components/shared/shimmer-skeleton";
import { formatCurrency } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "admin", label: "👑 Super Admin (Full Master Access)" },
  { value: "warehouse", label: "🏬 Warehouse / Godown Incharge" },
  { value: "salesman", label: "👔 Salesman / Floor Executive" },
  { value: "cashier", label: "💳 Cashier / POS Billing Counter" },
  { value: "accounts", label: "📊 Accounts & GST Officer" },
  { value: "hr", label: "👥 HR & Payroll Manager" },
  { value: "supplier", label: "🏭 Supplier / External Vendor" },
];

export default function UsersAndStaffPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedUserForAdvance, setSelectedUserForAdvance] = useState<any>(null);
  const [advanceAmountInput, setAdvanceAmountInput] = useState("");
  const [advanceNotesInput, setAdvanceNotesInput] = useState("");

  const [activeTab, setActiveTab] = useState<"login" | "kyc" | "salary">("login");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "salesman",
    mobile: "",
    avatar: "",
    address: "",
    city: "Gorakhpur",
    state: "Uttar Pradesh",
    pincode: "273008",
    idProofType: "Aadhaar Card",
    idProofNumber: "",
    idProofDoc: "",
    designation: "Sales Executive",
    monthlySalary: "25000",
    salaryType: "Fixed",
    joiningDate: new Date().toISOString().split("T")[0],
    advanceBalance: "0",
    monthlyAdvanceDeduction: "2000",
    bankName: "State Bank of India",
    bankAccountNo: "",
    bankIfsc: "SBIN0001234",
    assignedWarehouseName: "Ashoka Enterprises (Kunraghat Showroom)",
  });

  // Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-staff"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create user");
      return json;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "User created successfully!");
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users-staff"] });
      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "salesman",
        mobile: "",
        avatar: "",
        address: "",
        city: "Gorakhpur",
        state: "Uttar Pradesh",
        pincode: "273008",
        idProofType: "Aadhaar Card",
        idProofNumber: "",
        idProofDoc: "",
        designation: "Sales Executive",
        monthlySalary: "25000",
        salaryType: "Fixed",
        joiningDate: new Date().toISOString().split("T")[0],
        advanceBalance: "0",
        monthlyAdvanceDeduction: "2000",
        bankName: "State Bank of India",
        bankAccountNo: "",
        bankIfsc: "SBIN0001234",
        assignedWarehouseName: "Ashoka Enterprises (Kunraghat Showroom)",
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Advance Balance Mutation
  const updateAdvanceMutation = useMutation({
    mutationFn: async ({ id, newAdvance }: { id: string; newAdvance: number }) => {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, advanceBalance: newAdvance }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update advance");
      return json;
    },
    onSuccess: () => {
      toast.success("Advance balance updated successfully!");
      setIsAdvanceModalOpen(false);
      setSelectedUserForAdvance(null);
      setAdvanceAmountInput("");
      queryClient.invalidateQueries({ queryKey: ["users-staff"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete user");
      return json;
    },
    onSuccess: () => {
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["users-staff"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filtered Users
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.mobile?.includes(searchQuery) ||
      u.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.idProofNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Aggregate Stats
  const totalPayrollBudget = users.reduce((acc: number, curr: any) => acc + (curr.monthlySalary || 0), 0);
  const totalAdvanceLoan = users.reduce((acc: number, curr: any) => acc + (curr.advanceBalance || 0), 0);

  return (
    <PageShell
      title="Staff & User Management (KYC, Salary & Roles)"
      description="Create login credentials, manage Aadhaar/KYC identity proofs, base salary, advance loans, and showroom/godown assignments."
    >
      <div className="space-y-5">
        {/* KPI OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#30539C] to-[#203a70] text-white shadow-md border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Total Active Staff</p>
                <h3 className="text-2xl font-black mt-1 font-mono">{users.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-200" />
              </div>
            </div>
            <p className="text-[10px] text-blue-200/80 mt-2">Across Showrooms & Central Godowns</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Payroll</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{formatCurrency(totalPayrollBudget)}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-[10px] text-emerald-700 font-medium mt-2">Total Monthly Base Commitment</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Advance Loans Active</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">{formatCurrency(totalAdvanceLoan)}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Deductible in monthly salary cycles</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Action</p>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5">Onboard Employee</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full mt-2 bg-[#76C043] hover:bg-[#68ac3b] text-white font-bold text-xs shadow-md h-8 rounded-lg"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Staff / User
            </Button>
          </div>
        </div>

        {/* SEARCH & ROLE FILTER BAR */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by Name, Mobile, Email, Aadhaar/PAN #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Users" },
              { id: "salesman", label: "👔 Salesman" },
              { id: "cashier", label: "💳 Cashier" },
              { id: "warehouse", label: "🏬 Godown" },
              { id: "accounts", label: "📊 Accounts" },
              { id: "hr", label: "👥 HR" },
              { id: "supplier", label: "🏭 Supplier" },
              { id: "admin", label: "👑 Super Admin" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  roleFilter === tab.id
                    ? "bg-[#30539C] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* USERS & STAFF DIRECTORY TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Staff & KYC Directory ({filteredUsers.length})
              </h3>
              <p className="text-[11px] text-slate-500">Profiles, Role Access, KYC Proofs & Salary Breakdown</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#30539C] hover:bg-[#203a70] text-white font-bold text-xs h-8"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" /> New Staff
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Employee & Role</th>
                  <th className="p-3.5">Assigned Location</th>
                  <th className="p-3.5">KYC & Identity Proof</th>
                  <th className="p-3.5">Monthly Salary</th>
                  <th className="p-3.5">Advance Loan</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <TableShimmer rows={6} cols={6} />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      No staff users found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => {
                    const roleBadgeColor =
                      u.role === "admin"
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : u.role === "warehouse"
                        ? "bg-blue-100 text-blue-900 border-blue-300"
                        : u.role === "cashier"
                        ? "bg-purple-100 text-purple-900 border-purple-300"
                        : u.role === "accounts"
                        ? "bg-cyan-100 text-cyan-900 border-cyan-300"
                        : u.role === "hr"
                        ? "bg-rose-100 text-rose-900 border-rose-300"
                        : u.role === "supplier"
                        ? "bg-orange-100 text-orange-900 border-orange-300"
                        : "bg-emerald-100 text-emerald-900 border-emerald-300";

                    return (
                      <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Employee Details */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#30539C] to-[#5179cb] text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                u.name?.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 text-xs truncate">{u.name}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">{u.designation || "Staff"}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${roleBadgeColor}`}>
                                  {u.role}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                                  <Mail className="w-2.5 h-2.5" /> {u.email}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              {u.assignedWarehouseName?.toLowerCase().includes("godown") ? (
                                <Warehouse className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              ) : (
                                <Store className="w-3.5 h-3.5 text-[#76C043] flex-shrink-0" />
                              )}
                              <span className="truncate max-w-[180px]">{u.assignedWarehouseName || "Kunraghat Showroom"}</span>
                            </div>
                            {u.mobile && (
                              <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-slate-400" /> {u.mobile}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* KYC Proof */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span className="text-xs font-bold text-slate-800">{u.idProofType || "Aadhaar Card"}</span>
                            </div>
                            <p className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                              {u.idProofNumber || "DOC-NOT-SUBMITTED"}
                            </p>
                          </div>
                        </td>

                        {/* Salary */}
                        <td className="p-3.5">
                          <div>
                            <p className="font-mono font-black text-xs text-slate-900">
                              {formatCurrency(u.monthlySalary || 0)}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Type: <span className="font-bold text-slate-700">{u.salaryType || "Fixed"}</span>
                            </p>
                          </div>
                        </td>

                        {/* Advance Loan Balance */}
                        <td className="p-3.5">
                          <div>
                            <p className={`font-mono font-black text-xs ${u.advanceBalance > 0 ? "text-amber-600" : "text-slate-400"}`}>
                              {formatCurrency(u.advanceBalance || 0)}
                            </p>
                            <button
                              onClick={() => {
                                setSelectedUserForAdvance(u);
                                setAdvanceAmountInput(String(u.advanceBalance || 0));
                                setIsAdvanceModalOpen(true);
                              }}
                              className="text-[10px] text-blue-600 hover:underline font-bold mt-0.5 block"
                            >
                              + Adjust Advance
                            </button>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                toast.info(`User: ${u.name} (${u.email})\nRole: ${u.role}\nKYC: ${u.idProofType} - ${u.idProofNumber}`);
                              }}
                              className="h-7 px-2 text-[10px] font-bold text-slate-700"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {u.role !== "admin" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete user ${u.name}?`)) {
                                    deleteUserMutation.mutate(u._id);
                                  }
                                }}
                                className="h-7 px-2 text-[10px]"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE STAFF / USER MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#30539C]" />
              Onboard New Staff / User Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create login credentials, setup KYC identity documents, salary compensation & branch permissions.
            </DialogDescription>
          </DialogHeader>

          {/* Modal Tab Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mt-2">
            {[
              { id: "login", label: "1. Login & Role Access" },
              { id: "kyc", label: "2. Personal & KYC Proof" },
              { id: "salary", label: "3. Salary & Bank Info" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#30539C] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUserMutation.mutate(formData);
            }}
            className="space-y-4 pt-2"
          >
            {/* TAB 1: LOGIN & ROLE */}
            {activeTab === "login" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Amit Kumar Singh"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Login Email *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="amit.sales@valueplus.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Login Password *</Label>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-9 text-xs font-medium font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Assigned User Role (Panel Access) *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Assigned Branch / Central Godown</Label>
                  <Select
                    value={formData.assignedWarehouseName}
                    onValueChange={(val) => setFormData({ ...formData, assignedWarehouseName: val })}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ashoka Enterprises (Kunraghat Showroom)">
                        🏬 Ashoka Enterprises (Kunraghat Showroom)
                      </SelectItem>
                      <SelectItem value="Value Plus (Deoria Road Branch)">
                        🏬 Value Plus (Deoria Road Branch)
                      </SelectItem>
                      <SelectItem value="Gorakhpur Central Godown & Logistics Hub">
                        🏢 Gorakhpur Central Godown & Logistics Hub
                      </SelectItem>
                      <SelectItem value="GIDA Industrial Area Godown">
                        🏢 GIDA Industrial Area Godown
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* TAB 2: PERSONAL & KYC */}
            {activeTab === "kyc" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Mobile Phone Number *</Label>
                  <Input
                    required
                    placeholder="9140860604"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Designation / Job Title</Label>
                  <Input
                    placeholder="Senior Sales Executive"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">ID Proof Type (KYC)</Label>
                  <Select
                    value={formData.idProofType}
                    onValueChange={(val: any) => setFormData({ ...formData, idProofType: val })}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aadhaar Card">Aadhaar Card (UIDAI)</SelectItem>
                      <SelectItem value="PAN Card">PAN Card (Income Tax)</SelectItem>
                      <SelectItem value="Voter ID">Voter ID Card</SelectItem>
                      <SelectItem value="Driving License">Driving License</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Identity Proof Number</Label>
                  <Input
                    placeholder="e.g. 5421 8974 6321"
                    value={formData.idProofNumber}
                    onChange={(e) => setFormData({ ...formData, idProofNumber: e.target.value })}
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Residential Address</Label>
                  <Textarea
                    placeholder="House No, Street, Landmark, Gorakhpur, UP - 273008"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="text-xs min-h-[60px]"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: SALARY & BANK */}
            {activeTab === "salary" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Base Monthly Salary (₹) *</Label>
                  <Input
                    type="number"
                    required
                    placeholder="25000"
                    value={formData.monthlySalary}
                    onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                    className="h-9 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Salary Structure</Label>
                  <Select
                    value={formData.salaryType}
                    onValueChange={(val: any) => setFormData({ ...formData, salaryType: val })}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fixed">Fixed Monthly</SelectItem>
                      <SelectItem value="Fixed + Incentive">Fixed + Sales Incentive</SelectItem>
                      <SelectItem value="Commission Only">Commission Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Opening Advance Loan Balance (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.advanceBalance}
                    onChange={(e) => setFormData({ ...formData, advanceBalance: e.target.value })}
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Monthly Advance EMI Deduction (₹)</Label>
                  <Input
                    type="number"
                    placeholder="2000"
                    value={formData.monthlyAdvanceDeduction}
                    onChange={(e) => setFormData({ ...formData, monthlyAdvanceDeduction: e.target.value })}
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Bank Account Number</Label>
                  <Input
                    placeholder="987654321012"
                    value={formData.bankAccountNo}
                    onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Bank IFSC Code</Label>
                  <Input
                    placeholder="SBIN0001234"
                    value={formData.bankIfsc}
                    onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value })}
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                className="bg-[#76C043] hover:bg-[#68ac3b] text-white font-bold text-xs shadow-md px-6"
              >
                {createUserMutation.isPending ? "Creating..." : "Save & Register User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADJUST ADVANCE LOAN MODAL */}
      <Dialog open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600" />
              Adjust Advance Salary Loan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update loan/advance balance for <strong>{selectedUserForAdvance?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Current Advance Balance (₹)</Label>
              <Input
                type="number"
                value={advanceAmountInput}
                onChange={(e) => setAdvanceAmountInput(e.target.value)}
                className="h-9 text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Reason / Notes</Label>
              <Input
                placeholder="e.g. Festival advance sanctioned on 22 Aug"
                value={advanceNotesInput}
                onChange={(e) => setAdvanceNotesInput(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAdvanceModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUserForAdvance) {
                  updateAdvanceMutation.mutate({
                    id: selectedUserForAdvance._id,
                    newAdvance: Number(advanceAmountInput || 0),
                  });
                }
              }}
              disabled={updateAdvanceMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              {updateAdvanceMutation.isPending ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
