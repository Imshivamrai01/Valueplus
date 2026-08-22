"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface BranchOrGodown {
  id: string;
  name: string;
  code: string;
  type: "showroom" | "warehouse";
  city: string;
  address: string;
  isDefault?: boolean;
}

export const DEFAULT_BRANCHES: BranchOrGodown[] = [
  {
    id: "branch-kunraghat",
    name: "Ashoka Enterprises (Kunraghat Showroom)",
    code: "VP-KUN",
    type: "showroom",
    city: "Gorakhpur",
    address: "H. No. 116, Near Shanti Marriage House, Deoria Rd, Kunraghat",
    isDefault: true,
  },
  {
    id: "branch-deoria",
    name: "Value Plus (Deoria Road Branch)",
    code: "VP-DEO",
    type: "showroom",
    city: "Gorakhpur",
    address: "Deoria Bypass Road, Gorakhpur",
  },
  {
    id: "godown-main",
    name: "Gorakhpur Central Godown & Logistics Hub",
    code: "GDN-MAIN",
    type: "warehouse",
    city: "Gorakhpur",
    address: "Plot 42, Transport Nagar, Gorakhpur",
  },
  {
    id: "godown-industrial",
    name: "GIDA Industrial Area Godown",
    code: "GDN-GIDA",
    type: "warehouse",
    city: "Gorakhpur",
    address: "Sector 13, GIDA Industrial Area, Gorakhpur",
  },
];

interface BranchContextType {
  activeLocation: BranchOrGodown;
  setActiveLocation: (location: BranchOrGodown) => void;
  locations: BranchOrGodown[];
  isGodown: boolean;
  isShowroom: boolean;
  switchLocationById: (id: string) => void;
}

const BranchContext = createContext<BranchContextType>({
  activeLocation: DEFAULT_BRANCHES[0],
  setActiveLocation: () => {},
  locations: DEFAULT_BRANCHES,
  isGodown: false,
  isShowroom: true,
  switchLocationById: () => {},
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<BranchOrGodown[]>(DEFAULT_BRANCHES);
  const [activeLocation, setActiveLocationState] = useState<BranchOrGodown>(DEFAULT_BRANCHES[0]);

  // Load from localStorage or API on mount
  useEffect(() => {
    // Try fetching live warehouses from API to merge
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const apiLocations: BranchOrGodown[] = json.data.map((w: any) => ({
            id: w._id || w.id || w.code,
            name: w.name,
            code: w.code || "WH-01",
            type: (w.name?.toLowerCase().includes("godown") || w.name?.toLowerCase().includes("warehouse")) ? "warehouse" : "showroom",
            city: w.city || "Gorakhpur",
            address: w.address || "",
            isDefault: !!w.isDefault,
          }));

          const merged = [...DEFAULT_BRANCHES];
          apiLocations.forEach((apiLoc) => {
            if (!merged.some((m) => m.name.toLowerCase() === apiLoc.name.toLowerCase())) {
              merged.push(apiLoc);
            }
          });
          setLocations(merged);
        }
      })
      .catch((err) => {
        console.warn("Notice loading warehouses from API:", err);
      });

    try {
      const saved = localStorage.getItem("vp_active_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        setActiveLocationState(parsed);
      }
    } catch (e) {
      console.warn("Failed to load saved location from storage:", e);
    }
  }, []);

  const setActiveLocation = (loc: BranchOrGodown) => {
    setActiveLocationState(loc);
    try {
      localStorage.setItem("vp_active_location", JSON.stringify(loc));
      window.dispatchEvent(new CustomEvent("erp-location-changed", { detail: loc }));
    } catch (e) {
      console.error(e);
    }
  };

  const switchLocationById = (id: string) => {
    const found = locations.find((l) => l.id === id);
    if (found) {
      setActiveLocation(found);
    }
  };

  const isGodown = activeLocation.type === "warehouse";
  const isShowroom = activeLocation.type === "showroom";

  return (
    <BranchContext.Provider
      value={{
        activeLocation,
        setActiveLocation,
        locations,
        isGodown,
        isShowroom,
        switchLocationById,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
