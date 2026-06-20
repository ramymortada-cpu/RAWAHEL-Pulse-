import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LOGO_NAVY, LOGO_WHITE } from "@/lib/brand";
import {
  LayoutDashboard,
  LogOut,
  FileBarChart,
  History,
  GitCompareArrows,
  ImagePlus,
  Link as LinkIcon,
  Sheet as SheetIcon,
  Menu as MenuIcon,
  Boxes,
  Gauge,
} from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "لوحة النبض", path: "/" },
  { icon: FileBarChart, label: "التقارير", path: "/reports" },
  { icon: Boxes, label: "الكيانات التنفيذية", path: "/pulse#entities" },
  { icon: Gauge, label: "المسارات والأهداف", path: "/pulse#strategy" },
  { icon: Gauge, label: "المؤشرات", path: "/pulse#metrics" },
  { icon: GitCompareArrows, label: "إدخال المؤشرات", path: "/pulse#values" },
  { icon: ImagePlus, label: "شواهد الأثر", path: "/pulse#evidence" },
  { icon: LinkIcon, label: "روابط الإدخال الشهري", path: "/pulse/submission-links" },
  { icon: History, label: "تقارير الداعمين", path: "/reports#donor" },
  { icon: SheetIcon, label: "الإعدادات", path: "/integrations" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div
        className="flex items-center justify-center min-h-screen islamic-pattern"
        style={{ backgroundColor: "#1b2a5e" }}
      >
        <div className="flex flex-col items-center gap-8 p-10 max-w-md w-full bg-white/95 rounded-3xl shadow-2xl mx-4">
          <img
            src={LOGO_NAVY}
            alt="رواحل"
            className="h-20 object-contain"
          />
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-center text-[#1b2a5e]">
              نبض رواحل
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              RAWAHEL Pulse — نظام قياس الأثر والتقارير الشهرية لمؤسسة رواحل.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all bg-[#1b2a5e] hover:bg-[#2c3f7a]"
          >
            الدخول إلى نبض رواحل
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [currentHash, setCurrentHash] = useState(() =>
    typeof window === "undefined" ? "" : window.location.hash
  );
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  const splitMenuPath = (path: string) => {
    const [base, hash] = path.split("#");
    return { base, hash: hash ? `#${hash}` : "" };
  };
  const navigateTo = (path: string) => {
    const { base, hash } = splitMenuPath(path);
    setLocation(base);
    window.setTimeout(() => {
      if (hash) {
        if (window.location.hash !== hash) {
          window.history.pushState(null, "", `${base}${hash}`);
        }
        setCurrentHash(hash);
        document.getElementById(`pulse-${hash.slice(1)}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        if (window.location.hash) {
          window.history.pushState(null, "", base);
        }
        setCurrentHash("");
      }
    }, 0);
  };
  const activeMenuItem =
    menuItems.find(
      (item) => {
        const { base, hash } = splitMenuPath(item.path);
        if (hash) return location === base && currentHash === hash;
        return item.path === location || (item.path !== "/" && location.startsWith(item.path) && !currentHash);
      }
    ) ?? menuItems[0];
  const isMobile = useIsMobile();

  return (
    <>
      <Sidebar side="right" collapsible="icon" className="border-l-0">
        <SidebarHeader className="h-20 justify-center border-b border-white/10">
          <div className="flex items-center gap-3 px-2 w-full justify-center">
            {!isCollapsed ? (
              <img
                src={LOGO_WHITE}
                alt="رواحل"
                className="h-11 object-contain"
              />
            ) : (
              <span className="text-gold font-extrabold text-2xl text-[#d4a843]">ر</span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 pt-3">
          <SidebarMenu className="px-3 py-1 gap-1.5">
            {menuItems.map((item) => {
              const { base, hash } = splitMenuPath(item.path);
              const isActive =
                hash
                  ? location === base && currentHash === hash
                  : location === item.path ||
                    (item.path !== "/" && location.startsWith(item.path) && !currentHash);
              return (
                <SidebarMenuItem key={`${item.label}-${item.path}`}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => navigateTo(item.path)}
                    tooltip={item.label}
                    className="h-11 transition-all font-medium text-sidebar-foreground/85 hover:bg-white/10 data-[active=true]:bg-[#d4a843] data-[active=true]:text-[#1b2a5e] data-[active=true]:font-bold rounded-xl"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/10 transition-colors w-full text-right group-data-[collapsible=icon]:justify-center focus:outline-none">
                <Avatar className="h-9 w-9 border border-white/20 shrink-0">
                  <AvatarFallback className="text-xs font-medium bg-[#d4a843] text-[#1b2a5e]">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden text-right">
                  <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                    {user?.name || "-"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate mt-1.5">
                    {user?.email || "-"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="ml-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background">
                <MenuIcon />
              </SidebarTrigger>
              <span className="font-semibold tracking-tight text-foreground">
                {activeMenuItem?.label ?? "القائمة"}
              </span>
            </div>
            <img
              src={LOGO_NAVY}
              alt="رواحل"
              className="h-7 object-contain"
            />
          </div>
        )}
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </>
  );
}
