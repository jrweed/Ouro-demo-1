import { SyncProvider } from "@/components/providers/SyncProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SyncProvider>{children}</SyncProvider>;
}
