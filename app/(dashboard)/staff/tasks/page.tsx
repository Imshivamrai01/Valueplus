"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckSquare, Plus, Search, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function StaffTasksPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const [form, setForm] = useState({
    taskTitle: "",
    assignedStaff: "Amit Singh",
    priority: "Medium" as any,
    dueDate: new Date().toISOString().split("T")[0],
    dueTime: "18:00",
    description: "",
    status: "Pending" as any,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["staffTasks"],
    queryFn: async () => {
      const res = await fetch("/api/staff/tasks");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/staff/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create task");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Task assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["staffTasks"] });
      setIsNewTaskOpen(false);
      setForm({
        taskTitle: "",
        assignedStaff: "Amit Singh",
        priority: "Medium",
        dueDate: new Date().toISOString().split("T")[0],
        dueTime: "18:00",
        description: "",
        status: "Pending",
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

  const filtered = tasks.filter((t: any) =>
    (t.taskTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.assignedStaff || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageShell
      title="Staff Tasks & Operations"
      description="Admin task delegation, daily showroom objectives, follow-ups, and completion deadlines."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search task or staff member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-300 text-xs"
            />
          </div>

          <Button
            onClick={() => setIsNewTaskOpen(true)}
            className="bg-[#3F63AD] hover:bg-[#2E4F95] text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Assign New Task
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold">
              <tr>
                <th className="p-3">Task Title & Description</th>
                <th className="p-3">Assigned Staff</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Due Deadline</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading tasks...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">No active tasks assigned.</td></tr>
              ) : (
                filtered.map((t: any) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{t.taskTitle}</p>
                      {t.description && <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{t.assignedStaff}</td>
                    <td className="p-3">
                      <Badge className={
                        t.priority === "Urgent" ? "bg-red-100 text-red-800" :
                        t.priority === "High" ? "bg-orange-100 text-orange-800" :
                        "bg-blue-100 text-blue-800"
                      }>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {t.dueDate} {t.dueTime ? `at ${t.dueTime}` : ""}
                    </td>
                    <td className="p-3">
                      <Select
                        value={t.status}
                        onValueChange={(val) => updateStatusMutation.mutate({ id: t._id, status: val })}
                      >
                        <SelectTrigger className="h-7 text-xs bg-slate-50 border-slate-300 font-semibold w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-right">
                      {t.status !== "Completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: t._id, status: "Completed" })}
                          className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Done
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN TASK MODAL */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <CheckSquare className="w-4 h-4 text-[#3F63AD]" /> Assign Staff Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs pt-2">
            <div>
              <Label>Task Title *</Label>
              <Input placeholder="e.g. Complete physical audit of LED TVs" value={form.taskTitle} onChange={(e) => setForm({ ...form, taskTitle: e.target.value })} className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label>Assigned Staff Member *</Label>
              <Select value={form.assignedStaff} onValueChange={(v) => setForm({ ...form, assignedStaff: v })}>
                <SelectTrigger className="mt-1 bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amit Singh">Amit Singh (Head Exec)</SelectItem>
                  <SelectItem value="Rohan Verma">Rohan Verma (Electronics)</SelectItem>
                  <SelectItem value="Priya Sharma">Priya Sharma (Appliances)</SelectItem>
                  <SelectItem value="Deepak Rai">Deepak Rai (Mobile Counter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1 bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1 bg-slate-50" />
              </div>
            </div>
            <div>
              <Label>Task Description / Instructions</Label>
              <Input placeholder="Details for staff" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 bg-slate-50" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsNewTaskOpen(false)}>Cancel</Button>
            <Button onClick={() => createTaskMutation.mutate(form)} disabled={createTaskMutation.isPending} className="bg-[#3F63AD] text-white font-bold">
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
