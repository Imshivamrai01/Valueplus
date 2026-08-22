"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckSquare, Plus, Search, Clock, Calendar, CheckCircle2, AlertCircle, Trash2, Crown, Users, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { TableShimmer, MetricCardsShimmer } from "@/components/shared/shimmer-skeleton";

export default function StaffTasksPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role || "admin").toLowerCase();
  const currentUserName = session?.user?.name || "Staff Member";
  const isSuperAdminOrAdmin = userRole === "admin" || userRole === "superadmin" || userRole === "manager" || userRole === "hr";
  const isIndividualStaff = !isSuperAdminOrAdmin;

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const [form, setForm] = useState({
    taskTitle: "",
    assignedStaff: isIndividualStaff ? currentUserName : "Admin (Self)",
    priority: "Medium" as "Low" | "Medium" | "High" | "Urgent",
    dueDate: new Date().toISOString().split("T")[0],
    dueTime: "18:00",
    description: "",
    status: "Pending" as "Pending" | "In Progress" | "Completed" | "Overdue",
    createdBy: currentUserName,
  });

  // Fetch real registered users from MongoDB
  const { data: usersList = [] } = useQuery({
    queryKey: ["users-for-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      return json.success && Array.isArray(json.data) ? json.data : [];
    },
  });

  // Fetch tasks (Filtered strictly for individual staff if non-admin)
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["staffTasks", isIndividualStaff ? currentUserName : "all"],
    queryFn: async () => {
      let url = "/api/staff/tasks";
      if (isIndividualStaff) {
        url += `?staff=${encodeURIComponent(currentUserName)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  // Client-side strict isolation for non-admin
  const userScopedTasks = useMemo(() => {
    if (!isIndividualStaff) return rawTasks;
    const firstName = currentUserName.toLowerCase().split(" ")[0];
    return rawTasks.filter((t: any) => {
      const assigned = (t.assignedStaff || "").toLowerCase();
      return (
        assigned.includes(firstName) ||
        assigned === currentUserName.toLowerCase() ||
        assigned === "all staff" ||
        assigned === "sales staff" ||
        t.createdBy?.toLowerCase() === currentUserName.toLowerCase()
      );
    });
  }, [rawTasks, isIndividualStaff, currentUserName]);

  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/staff/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, createdBy: currentUserName }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create task");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Task created successfully");
      queryClient.invalidateQueries({ queryKey: ["staffTasks"] });
      setIsNewTaskOpen(false);
      setForm({
        taskTitle: "",
        assignedStaff: isIndividualStaff ? currentUserName : "Admin (Self)",
        priority: "Medium",
        dueDate: new Date().toISOString().split("T")[0],
        dueTime: "18:00",
        description: "",
        status: "Pending",
        createdBy: currentUserName,
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/staff/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Task status updated");
      queryClient.invalidateQueries({ queryKey: ["staffTasks"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff/tasks?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      return json;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["staffTasks"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalTasks = userScopedTasks.length;
  const adminTasks = userScopedTasks.filter((t: any) => t.assignedStaff?.includes("Admin") || t.assignedStaff?.includes("Self")).length;
  const staffTasks = userScopedTasks.filter((t: any) => !t.assignedStaff?.includes("Admin") && !t.assignedStaff?.includes("Self")).length;
  const inProgressTasks = userScopedTasks.filter((t: any) => t.status === "In Progress").length;
  const pendingTasks = userScopedTasks.filter((t: any) => t.status === "Pending").length;
  const completedTasks = userScopedTasks.filter((t: any) => t.status === "Completed").length;

  const filtered = userScopedTasks.filter((t: any) => {
    const matchesSearch =
      (t.taskTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.assignedStaff || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "admin") return t.assignedStaff?.includes("Admin") || t.assignedStaff?.includes("Self");
    if (activeTab === "staff") return !t.assignedStaff?.includes("Admin") && !t.assignedStaff?.includes("Self");
    if (activeTab === "pending") return t.status === "Pending";
    if (activeTab === "in_progress") return t.status === "In Progress";
    if (activeTab === "completed") return t.status === "Completed";
    return true;
  });

  return (
    <PageShell
      title={isIndividualStaff ? `My Daily Tasks (${currentUserName})` : "Staff Tasks & Operations Hub"}
      description={
        isIndividualStaff
          ? `Personal checklist and directives assigned exclusively to ${currentUserName}.`
          : "Admin control & delegation: Assign goals to sales executives, monitor pending tasks, and verify completed directives."
      }
    >
      <div className="space-y-4">
        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isIndividualStaff ? "My Assigned Tasks" : "Total Active Tasks"}
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{totalTasks}</h3>
              <p className="text-xs text-blue-600 font-bold mt-1">
                {isIndividualStaff ? `Assigned to ${currentUserName}` : "All Operational Directives"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#30539C]">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>

          {!isIndividualStaff ? (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">👑 Admin / Self Goals</p>
                <h3 className="text-2xl font-black text-purple-900 mt-0.5">{adminTasks}</h3>
                <p className="text-xs text-purple-600 font-bold mt-1">Direct Admin Responsibilities</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                <Crown className="w-5 h-5" />
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">⏳ Pending Tasks</p>
                <h3 className="text-2xl font-black text-amber-700 mt-0.5">{pendingTasks}</h3>
                <p className="text-xs text-amber-600 font-bold mt-1">Awaiting Action</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          )}

          {!isIndividualStaff ? (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">👥 Staff Delegations</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">{staffTasks}</h3>
                <p className="text-xs text-slate-600 font-bold mt-1">Assigned to Sales Execs</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <Users className="w-5 h-5" />
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">🔄 In Progress</p>
                <h3 className="text-2xl font-black text-blue-700 mt-0.5">{inProgressTasks}</h3>
                <p className="text-xs text-blue-600 font-bold mt-1">Under Execution</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Tasks</p>
              <h3 className="text-2xl font-black text-emerald-800 mt-0.5">{completedTasks}</h3>
              <p className="text-xs text-emerald-600 font-bold mt-1">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% Completed
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* CONTROLS STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={isIndividualStaff ? "Search my tasks..." : "Search task title, staff name, or description..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-300 text-xs"
            />
          </div>

          {/* FILTER PILLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(isIndividualStaff
              ? [
                  { key: "all", label: `All My Tasks (${totalTasks})` },
                  { key: "pending", label: `⏳ Pending (${pendingTasks})` },
                  { key: "in_progress", label: `🔄 In Progress (${inProgressTasks})` },
                  { key: "completed", label: `✅ Completed (${completedTasks})` },
                ]
              : [
                  { key: "all", label: `All (${totalTasks})` },
                  { key: "admin", label: `👑 Admin / Self (${adminTasks})` },
                  { key: "staff", label: `👥 Staff Tasks (${staffTasks})` },
                  { key: "pending", label: `⏳ Pending (${pendingTasks})` },
                  { key: "completed", label: `✅ Completed (${completedTasks})` },
                ]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                  activeTab === tab.key
                    ? "bg-[#30539C] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => setIsNewTaskOpen(true)}
            className="bg-[#30539C] hover:bg-[#1E3A8A] text-white text-xs font-bold h-9 px-4 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> {isIndividualStaff ? "+ Add My Task" : "Assign Task"}
          </Button>
        </div>

        {/* TASKS TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3 w-10 text-center">Done</th>
                <th className="p-3">Task Title & Details</th>
                {!isIndividualStaff && <th className="p-3">Assigned To</th>}
                <th className="p-3">Priority</th>
                <th className="p-3">Deadline</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableShimmer rows={6} cols={7} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    No tasks found for this view. Click &quot;{isIndividualStaff ? "Add My Task" : "Assign Task"}&quot; to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => {
                  const isDone = t.status === "Completed";
                  const isAdmin = t.assignedStaff?.includes("Admin") || t.assignedStaff?.includes("Self");

                  return (
                    <tr
                      key={t._id}
                      className={cn("hover:bg-slate-50/80 transition-colors", isDone && "bg-slate-50/50 opacity-75")}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: t._id, status: isDone ? "Pending" : "Completed" })}
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center border transition-colors mx-auto",
                            isDone
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 hover:border-slate-400 bg-white"
                          )}
                          title={isDone ? "Mark Pending" : "Mark Done"}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </td>
                      <td className="p-3">
                        <p className={cn("font-bold text-slate-900", isDone && "line-through text-slate-400")}>
                          {t.taskTitle}
                        </p>
                        {t.description && <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>}
                      </td>
                      {!isIndividualStaff && (
                        <td className="p-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-bold font-mono inline-flex items-center gap-1 border",
                              isAdmin
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            )}
                          >
                            {isAdmin ? "👑 Admin (Self)" : `👤 ${t.assignedStaff}`}
                          </span>
                        </td>
                      )}
                      <td className="p-3">
                        <Badge
                          className={
                            t.priority === "Urgent"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : t.priority === "High"
                              ? "bg-orange-100 text-orange-800 border-orange-200"
                              : t.priority === "Low"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          }
                        >
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {t.dueDate} {t.dueTime ? `· ${t.dueTime}` : ""}
                        </span>
                      </td>
                      <td className="p-3">
                        <Select
                          value={t.status}
                          onValueChange={(val) => updateStatusMutation.mutate({ id: t._id, status: val })}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-7 text-xs font-bold w-[125px] border",
                              t.status === "Completed" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                              t.status === "In Progress" && "bg-blue-50 text-blue-800 border-blue-200",
                              t.status === "Pending" && "bg-amber-50 text-amber-800 border-amber-200",
                              t.status === "Overdue" && "bg-rose-50 text-rose-800 border-rose-200"
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">✅ Completed</SelectItem>
                            <SelectItem value="Overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteTaskMutation.mutate(t._id)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* ASSIGN TASK MODAL */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="max-w-md p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-r from-[#1E293B] via-[#30539C] to-[#1E293B] text-white p-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">
                  {isIndividualStaff ? "Create Task / Checklist" : "Assign Task / Self-Goal"}
                </h3>
                <p className="text-xs text-slate-300">
                  {isIndividualStaff
                    ? `Create a personal task for ${currentUserName}`
                    : "Delegate tasks to showroom staff or assign self-admin task"}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTaskMutation.mutate(form);
            }}
            className="p-5 space-y-3.5 bg-slate-50"
          >
            <div>
              <Label className="text-xs font-bold text-slate-700">Task Title *</Label>
              <Input
                placeholder="e.g. Verify Bajaj Finance DO Settlement / Customer follow up"
                value={form.taskTitle}
                onChange={(e) => setForm({ ...form, taskTitle: e.target.value })}
                required
                className="mt-1 bg-white text-xs h-9 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Assign To *</Label>
                {isIndividualStaff ? (
                  <Input value={currentUserName} disabled className="mt-1 bg-slate-100 text-xs h-9 font-bold" />
                ) : (
                  <select
                    value={form.assignedStaff}
                    onChange={(e) => setForm({ ...form, assignedStaff: e.target.value })}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs font-bold shadow-xs focus:outline-none"
                  >
                    <option value="Admin (Self)">👑 Admin (Self)</option>
                    <option value="All Staff">👥 All Showroom Staff</option>
                    {usersList.map((u: any) => (
                      <option key={u._id || u.email} value={u.name}>
                        👤 {u.name} ({u.role?.toUpperCase() || "STAFF"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Priority</Label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs font-bold shadow-xs focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">🔥 Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-1 bg-white text-xs h-9 font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Due Time</Label>
                <Input
                  type="time"
                  value={form.dueTime}
                  onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                  className="mt-1 bg-white text-xs h-9 font-medium"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Description / Instructions</Label>
              <textarea
                placeholder="Add actionable details for task..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-xs font-medium shadow-xs focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewTaskOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createTaskMutation.isPending}
                className="bg-[#30539C] hover:bg-[#1E3A8A] text-white font-bold px-4"
              >
                {createTaskMutation.isPending ? "Saving..." : "Save Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
