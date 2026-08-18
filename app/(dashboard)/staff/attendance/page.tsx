"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/shared/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, CheckCircle2, UserCheck, Calendar, 
  LogIn, LogOut, Search, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

export default function StaffAttendancePage() {
  const queryClient = useQueryClient();
  const [selectedStaff, setSelectedStaff] = useState("Amit Singh");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: attendanceList = [], isLoading } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/staff/attendance?date=${selectedDate}`);
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const attendanceActionMutation = useMutation({
    mutationFn: async ({ staffName, action }: { staffName: string; action: "check_in" | "check_out" }) => {
      const res = await fetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName, action }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Action failed");
      return json;
    },
    onSuccess: (data: any) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <PageShell
      title="Staff Daily Attendance & Biometric Log"
      description="Record staff Check-In, Check-Out, daily working duration, and shift presence."
    >
      <div className="space-y-4">
        {/* CHECK IN / CHECK OUT ACTION CARD */}
        <div className="bg-gradient-to-r from-[#1B2537] via-[#243753] to-[#1B2537] text-white p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#76C043]" />
              <h3 className="text-base font-bold tracking-tight">Today's Attendance Counter: {new Date().toDateString()}</h3>
            </div>
            <p className="text-xs text-slate-300">
              Staff must log check-in upon store entry and check-out before leaving the premises.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-[180px] bg-white/10 text-white border-white/20 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Amit Singh">Amit Singh (Head Exec)</SelectItem>
                <SelectItem value="Rohan Verma">Rohan Verma (Electronics)</SelectItem>
                <SelectItem value="Priya Sharma">Priya Sharma (Appliances)</SelectItem>
                <SelectItem value="Deepak Rai">Deepak Rai (Mobile)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => attendanceActionMutation.mutate({ staffName: selectedStaff, action: "check_in" })}
              disabled={attendanceActionMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" /> Check In
            </Button>

            <Button
              onClick={() => attendanceActionMutation.mutate({ staffName: selectedStaff, action: "check_out" })}
              disabled={attendanceActionMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Check Out
            </Button>
          </div>
        </div>

        {/* ATTENDANCE TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase text-slate-700">Attendance Log for Date</h4>
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="w-40 h-8 text-xs bg-slate-50 border-slate-300 font-mono"
            />
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-700 uppercase font-bold">
              <tr>
                <th className="p-3">Staff Name</th>
                <th className="p-3">Date</th>
                <th className="p-3">Check-In Time</th>
                <th className="p-3">Check-Out Time</th>
                <th className="p-3">Working Duration</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading attendance...</td></tr>
              ) : attendanceList.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">No attendance records logged for this date.</td></tr>
              ) : (
                attendanceList.map((rec: any) => (
                  <tr key={rec._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{rec.staffName}</td>
                    <td className="p-3 font-mono text-slate-600">{rec.date}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{rec.checkInTime}</td>
                    <td className="p-3 font-mono font-bold text-red-700">{rec.checkOutTime || "Active Shift"}</td>
                    <td className="p-3 font-semibold text-slate-800">
                      {rec.workingDurationMinutes > 0 
                        ? `${Math.floor(rec.workingDurationMinutes / 60)} hrs ${rec.workingDurationMinutes % 60} mins` 
                        : "In Progress"}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className="bg-emerald-100 text-emerald-800">
                        {rec.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
