/**
 * Fleet management — trucks and drivers, sessionStorage-backed for the demo.
 *
 * TODO: Replace with Supabase:
 *   Tables:
 *     trucks (id, carrier_id, truck_num, year, make, model, equipment_type,
 *             status, city, state, notes, created_at)
 *     drivers (id, carrier_id, name, phone, cdl_number, cdl_expiry,
 *              status, assigned_truck_id, home_city, home_state, created_at)
 *
 *   Write:  INSERT INTO trucks (...) VALUES (...)
 *   Read:   SELECT * FROM trucks WHERE carrier_id = auth.uid() ORDER BY truck_num
 *   Update: UPDATE trucks SET ... WHERE id = $id AND carrier_id = auth.uid()
 *   Delete: DELETE FROM trucks WHERE id = $id AND carrier_id = auth.uid()
 */

import { TRUCK_STATUSES } from "@/lib/utils/constants";

export type TruckStatus = (typeof TRUCK_STATUSES)[number];
export type DriverStatus = "active" | "inactive" | "on_leave";

export interface Truck {
  id: string;
  truckNum: string; // e.g. "#207"
  year: number | null;
  make: string;
  model: string;
  equipmentType: "reefer_single" | "reefer_multi";
  status: TruckStatus;
  city: string;
  state: string;
  notes: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  cdlNumber: string;
  cdlExpiry: string; // YYYY-MM-DD
  status: DriverStatus;
  assignedTruckId: string | null;
  homeCity: string;
  homeState: string;
  createdAt: string;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TRUCKS_KEY = "ch_trucks";
const DRIVERS_KEY = "ch_drivers";

// ─── Seed data (mirrors dashboard demo) ──────────────────────────────────────

const SEED_TRUCKS: Truck[] = [
  {
    id: "t1",
    truckNum: "#207",
    year: 2021,
    make: "Freightliner",
    model: "Cascadia",
    equipmentType: "reefer_single",
    status: "available",
    city: "Charleston",
    state: "SC",
    notes: "",
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t2",
    truckNum: "#44",
    year: 2019,
    make: "Kenworth",
    model: "T680",
    equipmentType: "reefer_single",
    status: "loaded",
    city: "Savannah",
    state: "GA",
    notes: "",
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t3",
    truckNum: "#112",
    year: 2018,
    make: "Peterbilt",
    model: "579",
    equipmentType: "reefer_multi",
    status: "maintenance",
    city: "Jacksonville",
    state: "FL",
    notes: "Refrigeration unit needs service. No driver assigned.",
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t4",
    truckNum: "#89",
    year: 2022,
    make: "Volvo",
    model: "VNL 760",
    equipmentType: "reefer_single",
    status: "in_transit",
    city: "Atlanta",
    state: "GA",
    notes: "",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t5",
    truckNum: "#301",
    year: 2023,
    make: "Freightliner",
    model: "Cascadia",
    equipmentType: "reefer_single",
    status: "available",
    city: "Miami",
    state: "FL",
    notes: "",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const SEED_DRIVERS: Driver[] = [
  {
    id: "d1",
    name: "Joe Martinez",
    phone: "(843) 555-0142",
    cdlNumber: "SC-CDL-4421",
    cdlExpiry: "2027-06-30",
    status: "active",
    assignedTruckId: "t1",
    homeCity: "Charleston",
    homeState: "SC",
    createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "d2",
    name: "Mike Richardson",
    phone: "(912) 555-0189",
    cdlNumber: "GA-CDL-7713",
    cdlExpiry: "2026-11-15",
    status: "active",
    assignedTruckId: "t2",
    homeCity: "Savannah",
    homeState: "GA",
    createdAt: new Date(Date.now() - 115 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "d3",
    name: "Tony Lewis",
    phone: "(404) 555-0237",
    cdlNumber: "GA-CDL-3358",
    cdlExpiry: "2028-03-20",
    status: "active",
    assignedTruckId: "t4",
    homeCity: "Atlanta",
    homeState: "GA",
    createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "d4",
    name: "Sam Kim",
    phone: "(305) 555-0411",
    cdlNumber: "FL-CDL-9902",
    cdlExpiry: "2027-09-01",
    status: "active",
    assignedTruckId: "t5",
    homeCity: "Miami",
    homeState: "FL",
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient() {
  return typeof window !== "undefined";
}

// ─── Trucks ───────────────────────────────────────────────────────────────────

export function getTrucks(): Truck[] {
  if (!isClient()) return SEED_TRUCKS;
  try {
    const raw = sessionStorage.getItem(TRUCKS_KEY);
    if (!raw) {
      // First visit — seed demo data
      sessionStorage.setItem(TRUCKS_KEY, JSON.stringify(SEED_TRUCKS));
      return SEED_TRUCKS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_TRUCKS;
  }
}

function saveTrucks(trucks: Truck[]): void {
  if (!isClient()) return;
  sessionStorage.setItem(TRUCKS_KEY, JSON.stringify(trucks));
  window.dispatchEvent(new Event("ch_fleet_updated"));
}

export function getTruck(id: string): Truck | null {
  return getTrucks().find((t) => t.id === id) ?? null;
}

export function createTruck(data: Omit<Truck, "id" | "createdAt">): Truck {
  const truck: Truck = {
    ...data,
    id: `truck-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveTrucks([...getTrucks(), truck]);
  return truck;
}

export function updateTruck(id: string, data: Partial<Omit<Truck, "id" | "createdAt">>): Truck | null {
  const trucks = getTrucks();
  const idx = trucks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const updated = { ...trucks[idx], ...data };
  trucks[idx] = updated;
  saveTrucks(trucks);
  return updated;
}

export function deleteTruck(id: string): void {
  saveTrucks(getTrucks().filter((t) => t.id !== id));
  // Unassign any driver assigned to this truck
  saveDrivers(getDrivers().map((d) =>
    d.assignedTruckId === id ? { ...d, assignedTruckId: null } : d
  ));
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export function getDrivers(): Driver[] {
  if (!isClient()) return SEED_DRIVERS;
  try {
    const raw = sessionStorage.getItem(DRIVERS_KEY);
    if (!raw) {
      sessionStorage.setItem(DRIVERS_KEY, JSON.stringify(SEED_DRIVERS));
      return SEED_DRIVERS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_DRIVERS;
  }
}

function saveDrivers(drivers: Driver[]): void {
  if (!isClient()) return;
  sessionStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers));
}

export function getDriver(id: string): Driver | null {
  return getDrivers().find((d) => d.id === id) ?? null;
}

export function createDriver(data: Omit<Driver, "id" | "createdAt">): Driver {
  const driver: Driver = {
    ...data,
    id: `driver-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  // If assigning to a truck, update that truck's associated driver name
  // (in Supabase this would be a FK join, here we just store the relation on the driver)
  saveDrivers([...getDrivers(), driver]);
  return driver;
}

export function updateDriver(id: string, data: Partial<Omit<Driver, "id" | "createdAt">>): Driver | null {
  const drivers = getDrivers();
  const idx = drivers.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  // If reassigning truck, unassign from previous
  if (data.assignedTruckId !== undefined && data.assignedTruckId !== drivers[idx].assignedTruckId) {
    // Remove assignment from any driver previously on the new truck
    drivers.forEach((d, i) => {
      if (i !== idx && d.assignedTruckId === data.assignedTruckId) {
        drivers[i] = { ...d, assignedTruckId: null };
      }
    });
  }

  const updated = { ...drivers[idx], ...data };
  drivers[idx] = updated;
  saveDrivers(drivers);
  return updated;
}

export function deleteDriver(id: string): void {
  saveDrivers(getDrivers().filter((d) => d.id !== id));
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Returns the driver assigned to a given truck, if any. */
export function getDriverForTruck(truckId: string): Driver | null {
  return getDrivers().find((d) => d.assignedTruckId === truckId) ?? null;
}

/** Returns the truck assigned to a given driver, if any. */
export function getTruckForDriver(driverId: string): Truck | null {
  const driver = getDriver(driverId);
  if (!driver?.assignedTruckId) return null;
  return getTruck(driver.assignedTruckId);
}
