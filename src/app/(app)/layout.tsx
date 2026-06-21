import { AppSidebar } from "@/components/app/sidebar";
import { ViewerProvider } from "@/components/app/viewer-provider";
import { getViewer } from "@/server/viewer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <ViewerProvider viewer={viewer}>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </ViewerProvider>
  );
}
