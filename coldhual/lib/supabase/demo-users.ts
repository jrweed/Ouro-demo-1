/**
 * Demo user credentials for development / demo mode.
 *
 * TODO: Remove this file entirely when real Supabase auth is wired.
 * In production, roles come from the `profiles` table:
 *   SELECT role FROM profiles WHERE id = auth.uid()
 */

import { UserRole } from "@/lib/utils/constants";

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  companyName: string;
  companyCity: string;
  companyState: string;
  contactName: string;
  mcNumber?: string; // carriers only
  initials: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "demo-3pl-001",
    email: "broker@test.com",
    password: "demo1234",
    role: "3pl",
    companyName: "Lowcountry Logistics",
    companyCity: "Charleston",
    companyState: "SC",
    contactName: "Jamie Carter",
    initials: "JC",
  },
  {
    id: "demo-carrier-001",
    email: "carrier@test.com",
    password: "demo1234",
    role: "carrier",
    companyName: "Coastal Reefer LLC",
    companyCity: "Savannah",
    companyState: "GA",
    contactName: "Chris Reyes",
    mcNumber: "MC-482910",
    initials: "CR",
  },
];
