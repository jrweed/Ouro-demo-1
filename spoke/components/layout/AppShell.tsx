import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { UserRole } from "@/lib/utils/constants";

interface AppShellProps {
  role: UserRole;
  companyName: string;
  companyCity?: string;
  companyState?: string;
  mcNumber?: string;
  initials: string;
  children: React.ReactNode;
}

export function AppShell({
  role,
  companyName,
  companyCity,
  companyState,
  mcNumber,
  initials,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-[#f9fafb] font-sans">
      <TopBar
        role={role}
        companyName={companyName}
        companyCity={companyCity}
        companyState={companyState}
        mcNumber={mcNumber}
        initials={initials}
      />
      <div className="flex flex-1">
        <Sidebar role={role} />
        <main className="flex-1 overflow-y-auto px-8 py-7 max-w-[1200px]">
          {children}
        </main>
      </div>
    </div>
  );
}
