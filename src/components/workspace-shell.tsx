"use client";

import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare2,
  ChevronDown,
  CircleUserRound,
  FileText,
  FolderKanban,
  Images,
  LayoutDashboard,
  Library,
  LogIn,
  LogOut,
  MessageSquareText,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  UserPlus,
  Workflow,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useData } from "@/lib/data-context";
import { useOptionalAuth } from "@/lib/optional-auth";
import type { SettingsState } from "@/lib/types";
import { useHydratedReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ShellPage =
  | "dashboard"
  | "projects"
  | "clients"
  | "timeline"
  | "calendar"
  | "media"
  | "resources"
  | "feedback"
  | "templates"
  | "reports"
  | "integrations"
  | "team"
  | "team-chat"
  | "settings"
  | "account"
  | "profile"
  | "profile-edit"
  | "organization-profile";

type RouteItem = {
  page: ShellPage;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  shortcut?: string;
};

type RouteGroup = {
  label: string;
  items: RouteItem[];
};

const routeGroups: RouteGroup[] = [
  {
    label: "Overview",
    items: [
      { page: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard, shortcut: "G D" },
      { page: "calendar", label: "Calendar", href: "/calendar", icon: CalendarDays, shortcut: "G C" },
      { page: "timeline", label: "Timeline", href: "/timeline", icon: Workflow },
    ],
  },
  {
    label: "Work",
    items: [
      { page: "projects", label: "Projects", href: "/projects", icon: FolderKanban, shortcut: "G P" },
      { page: "clients", label: "Clients", href: "/clients", icon: UsersRound },
      { page: "feedback", label: "Reviews", href: "/feedback", icon: MessageSquareText },
      { page: "media", label: "Media", href: "/media", icon: Images },
      { page: "templates", label: "Templates", href: "/templates", icon: CheckSquare2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { page: "resources", label: "Resources", href: "/resources", icon: Library },
      { page: "integrations", label: "Integrations", href: "/integrations", icon: Sparkles },
      { page: "reports", label: "Reports", href: "/reports", icon: ChartNoAxesCombined, shortcut: "G R" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { page: "team", label: "Team", href: "/team", icon: Users },
      { page: "team-chat", label: "Team chat", href: "/team-chat", icon: MessageSquareText },
      { page: "settings", label: "Settings", href: "/settings", icon: Settings, shortcut: "G S" },
    ],
  },
];

const allRoutes = routeGroups.flatMap((group) => group.items);
const starterPages = new Set<ShellPage>(["dashboard", "projects", "calendar", "feedback", "settings"]);

const mobileRoutes: RouteItem[] = [
  allRoutes.find((route) => route.page === "dashboard")!,
  allRoutes.find((route) => route.page === "projects")!,
  allRoutes.find((route) => route.page === "calendar")!,
  allRoutes.find((route) => route.page === "clients")!,
];

const shellTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

const quickRouteShortcuts: Record<string, string> = {
  d: "/",
  c: "/calendar",
  p: "/projects",
  r: "/reports",
  s: "/settings",
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CL";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function routeIsActive(currentPage: ShellPage, item: RouteItem) {
  if (currentPage === item.page) return true;
  if (item.page === "projects") return ["projects"].includes(currentPage);
  if (item.page === "clients") return currentPage === "clients";
  if (item.page === "media") return currentPage === "media";
  if (item.page === "team") return currentPage === "team";
  if (item.page === "settings") return ["settings", "account"].includes(currentPage);
  return false;
}

export function WorkspaceShell({
  page,
  settings,
  onNewProject,
  canCreateProject,
  starterNavigation = false,
  notificationSlot,
  children,
}: {
  page: ShellPage;
  settings: SettingsState;
  onNewProject: () => void;
  canCreateProject: boolean;
  starterNavigation?: boolean;
  notificationSlot?: ReactNode;
  children: ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const goChordRef = useRef(false);
  const goChordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useHydratedReducedMotion();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
        return;
      }

      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if (isEditing || event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (goChordRef.current) {
        goChordRef.current = false;
        if (goChordTimerRef.current) clearTimeout(goChordTimerRef.current);
        const href = quickRouteShortcuts[key];
        if (href) {
          event.preventDefault();
          router.push(href);
        }
        return;
      }

      if (key === "g") {
        goChordRef.current = true;
        goChordTimerRef.current = setTimeout(() => {
          goChordRef.current = false;
        }, 900);
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (goChordTimerRef.current) clearTimeout(goChordTimerRef.current);
    };
  }, [router]);

  const title = useMemo(
    () => allRoutes.find((route) => route.page === page)?.label ?? "Relay",
    [page],
  );

  return (
    <div className="min-h-dvh bg-[var(--app-canvas)] text-[var(--app-ink)] lg:h-dvh lg:overflow-hidden lg:bg-[var(--app-sidebar)]">
      <DesktopSidebar
        page={page}
        settings={settings}
        starterNavigation={starterNavigation}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onSearch={() => setCommandOpen(true)}
      />

      <div
        className={cn(
          "min-h-dvh transition-[padding] ease-[cubic-bezier(0.22,1,0.36,1)]",
          reduceMotion ? "duration-0" : "duration-300",
          collapsed ? "lg:pl-14" : "lg:pl-60",
        )}
      >
        <header
          className={cn(
            "fixed inset-x-0 top-0 z-30 flex h-12 items-center bg-[var(--app-sidebar)] px-2.5 transition-[left] ease-[cubic-bezier(0.22,1,0.36,1)] lg:justify-between lg:px-3",
            reduceMotion ? "duration-0" : "duration-300",
            collapsed ? "lg:left-14" : "lg:left-60",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="font-display text-lg font-bold tracking-[-0.045em]">
                Relay
              </span>
            </div>
            <p className="truncate text-sm font-semibold lg:hidden">{title}</p>
            <p className="hidden items-center gap-1.5 text-xs lg:flex" aria-label={`Current location: ${title}`}>
              <span className="font-medium text-[var(--app-subtle)]">Relay</span>
              <span aria-hidden="true" className="text-[var(--app-border)]">/</span>
              <span className="font-medium text-[var(--app-ink)]">{title}</span>
            </p>
          </div>

          <div className="ml-3 flex items-center gap-1.5 lg:ml-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Search pages and workspace actions (Ctrl K)"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-[18px]" />
            </Button>
            <motion.div
              whileHover={canCreateProject && !reduceMotion ? { y: -1 } : undefined}
              whileTap={canCreateProject && !reduceMotion ? { scale: 0.98, y: 0 } : undefined}
              transition={{ duration: 0.12 }}
              className="hidden sm:block"
            >
              <Button
                aria-label="Quick create project"
                className="h-8 bg-[var(--app-accent)] px-3 text-xs text-[var(--app-accent-foreground)] shadow-none hover:bg-[var(--app-highlight)]"
                onClick={onNewProject}
                disabled={!canCreateProject}
              >
                <Plus className="size-3.5" />
                Quick create
              </Button>
            </motion.div>
            {notificationSlot ?? (
              <motion.div whileTap={reduceMotion ? undefined : { scale: 0.92 }} transition={{ duration: 0.1 }}>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="size-[18px]" />
                </Button>
              </motion.div>
            )}
            <ProfileMenu settings={settings} compact page={page} />
          </div>
        </header>

        <main
          id="main-content"
          data-testid="workspace-content-surface"
          tabIndex={-1}
          className={cn(
            "workspace-scrollbar-hidden h-[calc(100dvh_-_68px_-_env(safe-area-inset-bottom))] overflow-y-auto bg-[var(--app-canvas)] pt-12 outline-none lg:fixed lg:bottom-1.5 lg:right-1.5 lg:top-[54px] lg:h-auto lg:min-h-0 lg:overscroll-contain lg:rounded-xl lg:border lg:border-[var(--app-border)] lg:pt-0 lg:transition-[left] lg:ease-[cubic-bezier(0.22,1,0.36,1)]",
            reduceMotion ? "lg:duration-0" : "lg:duration-300",
            collapsed ? "lg:left-[62px]" : "lg:left-[246px]",
          )}
        >
          <div className="min-h-full lg:h-full">
            {children}
          </div>
        </main>
      </div>

      {(page === "dashboard" || page === "projects") && canCreateProject ? (
        <motion.button
          type="button"
          aria-label="New Project"
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-40 flex min-h-12 items-center gap-2 rounded-md bg-[var(--app-accent)] px-4 text-sm font-semibold text-[var(--app-accent-foreground)] shadow-[var(--app-shadow-2)] outline-none hover:bg-[var(--app-highlight)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-canvas)] sm:hidden"
          onClick={onNewProject}
        >
          <Plus className="size-4" />
          New project
        </motion.button>
      ) : null}

      <MobileNavigation page={page} open={moreOpen} onOpenChange={setMoreOpen} starterNavigation={starterNavigation} />
      <WorkspaceCommand open={commandOpen} onOpenChange={setCommandOpen} onNewProject={onNewProject} />
    </div>
  );
}

function DesktopSidebar({
  page,
  settings,
  starterNavigation,
  collapsed,
  onCollapsedChange,
  onSearch,
}: {
  page: ShellPage;
  settings: SettingsState;
  starterNavigation: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onSearch: () => void;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const [showAllTools, setShowAllTools] = useState(false);
  const visibleGroups = starterNavigation && !showAllTools
    ? routeGroups.map((group) => ({ ...group, items: group.items.filter((item) => starterPages.has(item.page) || item.page === page) })).filter((group) => group.items.length)
    : routeGroups;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 56 : 240 }}
      transition={reduceMotion ? { duration: 0 } : shellTransition}
      className="fixed inset-y-0 left-0 z-40 hidden overflow-hidden bg-[var(--app-sidebar)] lg:flex lg:flex-col"
    >
      <div className={cn(
        "grid h-12 grid-cols-1 items-center justify-items-center bg-[var(--app-sidebar)] px-1.5",
      )}>
        <Link
          href="/"
          aria-label="Go to dashboard"
          className={cn(
            "min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-sidebar)]",
            "flex h-full items-center overflow-hidden",
            collapsed ? "w-12 justify-center" : "w-full justify-start px-2",
          )}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: collapsed ? 0.88 : 1,
              height: collapsed ? 26 : 48,
              width: collapsed ? 26 : 127,
            }}
            transition={reduceMotion ? { duration: 0 } : shellTransition}
            className={cn(
              "relative shrink-0 overflow-hidden",
              collapsed ? "mx-auto" : "mr-auto",
            )}
          >
            <img
              src={collapsed ? "/brand/favicon.png" : "/brand/logo-mark.png"}
              alt="Relay"
              width={160}
              height={160}
              className={cn(
                "brand-logo-light h-full w-full",
                collapsed ? "object-contain" : "object-cover",
              )}
            />
            <img
              src="/brand/app-icon-dark.svg"
              alt=""
              aria-hidden="true"
              width={160}
              height={160}
              className="brand-logo-dark h-full w-full object-contain"
            />
          </motion.div>
        </Link>

      </div>

      <div className="px-1.5 pb-1.5">
        <Button
          variant="outline"
          className={cn(
            "h-8 border-[var(--app-border)] bg-[var(--app-control)] px-2 text-xs text-[var(--app-muted)] shadow-none hover:bg-[var(--app-hover)]",
            collapsed ? "w-full justify-center" : "w-full justify-start",
          )}
          onClick={onSearch}
          aria-label="Quick Search (Ctrl K)"
        >
          <Search className="size-3.5 shrink-0" />
          {!collapsed ? (
            <>
              <span className="truncate">Quick Search</span>
              <kbd className="ml-auto font-mono text-[9px] text-[var(--app-subtle)]">Ctrl K</kbd>
            </>
          ) : null}
        </Button>
      </div>

      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label} className="mb-2.5">
            {!collapsed ? (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : shellTransition}
                className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-subtle)]"
              >
                {group.label}
              </motion.p>
            ) : (
              <div className="mb-1 flex h-2 items-center justify-center" aria-hidden="true">
                {groupIndex > 0 ? <span className="h-px w-8 bg-[var(--app-border)]" /> : null}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarRoute
                  key={item.page}
                  item={item}
                  active={routeIsActive(page, item)}
                  collapsed={collapsed}
                  reduceMotion={reduceMotion}
                />
              ))}
            </div>
          </div>
        ))}
        {starterNavigation ? (
          <button
            type="button"
            className={cn("mt-1 flex min-h-9 w-full items-center rounded-md text-xs font-semibold text-[var(--app-muted)] outline-none hover:bg-[var(--app-hover)] hover:text-[var(--app-ink)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]", collapsed ? "justify-center" : "gap-2 px-2.5")}
            onClick={() => setShowAllTools((value) => !value)}
            aria-expanded={showAllTools}
          >
            <MoreHorizontal className="size-4" />{collapsed ? <span className="sr-only">{showAllTools ? "Show starter tools" : "Show all tools"}</span> : showAllTools ? "Show starter tools" : "Show all tools"}
          </button>
        ) : null}
      </nav>

      <div className="border-t border-[var(--app-border)] p-1.5">
        <button
          type="button"
          className={cn(
            "mb-1 flex min-h-9 w-full items-center rounded-md text-xs font-semibold text-[var(--app-muted)] outline-none hover:bg-[var(--app-hover)] hover:text-[var(--app-ink)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]",
            collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
          )}
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed ? <span>Collapse sidebar</span> : null}
        </button>
        {!collapsed ? (
          <footer className="mt-2 border-t border-[var(--app-border)] px-2 pt-2 text-[11px] leading-5 text-[var(--app-subtle)]">
            <nav aria-label="Support and legal" className="flex flex-wrap gap-x-3 gap-y-1">
              <Link className="hover:text-[var(--app-ink)]" href="/contact">Contact</Link>
              <Link className="hover:text-[var(--app-ink)]" href="/privacy">Privacy</Link>
              <Link className="hover:text-[var(--app-ink)]" href="/terms">Terms</Link>
              <Link className="hover:text-[var(--app-ink)]" href="/accessibility">Accessibility</Link>
            </nav>
            <p className="mt-1">© {new Date().getFullYear()} Relay</p>
          </footer>
        ) : null}
      </div>
    </motion.aside>
  );
}


function SidebarRoute({
  item,
  active,
  collapsed,
  reduceMotion,
}: {
  item: RouteItem;
  active: boolean;
  collapsed: boolean;
  reduceMotion: boolean | null;
}) {
  const Icon = item.icon;
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!active || reduceMotion) return;
    setShowPass(true);
    const timer = window.setTimeout(() => setShowPass(false), 520);
    return () => window.clearTimeout(timer);
  }, [active, reduceMotion]);

  const link = (
    <Link
      href={item.href}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center overflow-hidden rounded text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset",
        collapsed ? "mx-auto w-9 justify-center px-0" : "gap-2.5 px-2.5",
        active
          ? "bg-[var(--app-active)] text-[var(--app-ink)]"
          : "text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-ink)]",
      )}
    >
      {showPass ? (
        <motion.span
          initial={{ x: "-110%", opacity: 0 }}
          animate={{ x: "110%", opacity: [0, 0.7, 0] }}
          transition={{ duration: 0.52, ease: "easeOut" }}
          className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
      ) : null}
      <motion.span
        animate={{ scale: active && !reduceMotion ? 1.04 : 1 }}
        transition={reduceMotion ? { duration: 0 } : shellTransition}
        className="relative z-10 flex shrink-0"
      >
        <Icon className="size-4" strokeWidth={active ? 2.1 : 1.8} />
      </motion.span>
      {!collapsed ? (
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : shellTransition}
          className="relative z-10 truncate"
        >
          {item.label}
        </motion.span>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function ProfileMenu({ settings, collapsed = false, compact = false, page }: { settings: SettingsState; collapsed?: boolean; compact?: boolean; page: ShellPage }) {
  const { isAuthEnabled } = useData();
  const { isSignedIn, openSignIn, openSignUp, signOut } = useOptionalAuth();
  const [open, setOpen] = useState(false);
  const reduceMotion = useHydratedReducedMotion();
  const name = settings.profileName || "Your profile";
  const handle = settings.profileUsername ? `@${settings.profileUsername.replace(/^@/, "")}` : settings.teamRole || "Editor";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          type="button"
          whileHover={reduceMotion ? undefined : { y: -1 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97, y: 0 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "flex w-full items-center rounded-md text-left outline-none transition-[background-color,box-shadow] hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]",
            compact || collapsed ? "justify-center p-1" : "gap-2.5 p-2",
          )}
          aria-label="Open profile menu"
        >
          <Avatar className="size-8 border border-[var(--app-border)]">
            <AvatarImage src={settings.profileImageUrl || undefined} alt="" />
            <AvatarFallback className="bg-[var(--app-avatar-surface)] text-[11px] font-semibold text-[var(--app-ink)]">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && !compact ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold">{name}</span>
                <span className="block truncate text-[11px] text-[var(--app-muted)]">{handle}</span>
              </span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.16 }}
                className="flex"
              >
                <ChevronDown className="size-3.5 text-[var(--app-muted)]" />
              </motion.span>
            </>
          ) : null}
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={compact ? "bottom" : collapsed ? "right" : "top"} align={compact ? "end" : "start"} className="w-64">
        <DropdownMenuLabel>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs font-normal text-muted-foreground">{handle}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!isSignedIn ? (
          <>
            <DropdownMenuItem
              disabled={!isAuthEnabled}
              onSelect={() => openSignIn()}
              className="bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground"
            >
              <LogIn /> Sign in
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!isAuthEnabled} onSelect={() => openSignUp()}>
              <UserPlus /> Create account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            aria-current={page === "profile" ? "page" : undefined}
            className={cn(page === "profile" && "bg-accent")}
          >
            <CircleUserRound /> Public profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/organization"
            aria-current={page === "organization-profile" ? "page" : undefined}
            className={cn(page === "organization-profile" && "bg-accent")}
          >
            <UsersRound /> Organization profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/profile/edit"
            aria-current={page === "profile-edit" ? "page" : undefined}
            className={cn(page === "profile-edit" && "bg-accent")}
          >
            <Sparkles /> Edit profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/account"
            aria-current={page === "account" ? "page" : undefined}
            className={cn(page === "account" && "bg-accent")}
          >
            <Settings /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Legal and privacy
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/privacy">
            <ShieldCheck /> Privacy Policy
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/terms">
            <FileText /> Terms of Service
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isSignedIn ? (
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        ) : isAuthEnabled ? null : (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Sign-in needs Clerk and Convex configuration.
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkspaceCommand({
  open,
  onOpenChange,
  onNewProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewProject: () => void;
}) {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-[var(--app-strong-border)] p-0 shadow-[0_24px_80px_color-mix(in_srgb,var(--app-ink)_18%,transparent)] sm:max-w-[620px]">
        <DialogTitle className="sr-only">Workspace command menu</DialogTitle>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Command>
            <CommandInput aria-label="Search workspace commands" placeholder="Search pages and actions..." />
            <CommandList className="max-h-[420px]">
              <CommandEmpty>No matching workspace action found.</CommandEmpty>
              <CommandGroup heading="Quick actions">
                <CommandItem
                  onSelect={() => {
                    onOpenChange(false);
                    onNewProject();
                  }}
                >
                  <Plus /> Create new project
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              {routeGroups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem key={item.page} asChild>
                        <Link href={item.href} onClick={() => onOpenChange(false)}>
                          <Icon />
                          {item.label}
                          {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
                        </Link>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function MobileNavigation({
  page,
  open,
  onOpenChange,
  starterNavigation,
}: {
  page: ShellPage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starterNavigation: boolean;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const primaryRoutes = starterNavigation
    ? ["dashboard", "projects", "calendar", "feedback"].map((key) => allRoutes.find((route) => route.page === key)!)
    : mobileRoutes;

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(68px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-panel)_94%,transparent)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      {primaryRoutes.map((item) => {
        const Icon = item.icon;
        const active = routeIsActive(page, item);
        return (
          <Link
            key={item.page}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset",
              active ? "text-[var(--app-highlight)]" : "text-[var(--app-muted)]",
            )}
          >
            {active ? (
              <motion.span
                layoutId="mobile-active-route"
                transition={reduceMotion ? { duration: 0 } : shellTransition}
                className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--app-accent)]"
              />
            ) : null}
            <motion.span
              whileTap={reduceMotion ? undefined : { scale: 0.88 }}
              className="flex flex-col items-center justify-center gap-1"
            >
              <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </motion.span>
          </Link>
        );
      })}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <motion.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            className="flex flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium text-[var(--app-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-inset"
            aria-label="Open more workspace pages"
          >
            <motion.span
              animate={{ rotate: open ? 90 : 0, scale: open && !reduceMotion ? 1.06 : 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              className="flex"
            >
              <MoreHorizontal className="size-[19px]" />
            </motion.span>
            More
          </motion.button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[82dvh] rounded-t-xl px-3 pb-8">
          <SheetHeader className="px-1">
            <SheetTitle>Workspace</SheetTitle>
          </SheetHeader>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {allRoutes.filter((route) => !primaryRoutes.some((mobile) => mobile.page === route.page)).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  aria-current={routeIsActive(page, item) ? "page" : undefined}
                  className="group flex items-center gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-sm font-medium outline-none transition-[background-color,border-color] hover:border-[var(--app-strong-border)] hover:bg-[var(--app-soft-panel)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  <motion.span
                    whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                    className="flex"
                  >
                    <Icon className="size-[18px] text-[var(--app-muted)] transition-colors group-hover:text-[var(--app-ink)]" />
                  </motion.span>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 border-t border-[var(--app-border)] pt-4">
            <p className="px-1 text-xs font-semibold text-[var(--app-muted)]">Support and legal</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <Link className="min-h-12 rounded-md border border-[var(--app-border)] p-3" href="/contact" onClick={() => onOpenChange(false)}>Contact</Link>
              <Link className="min-h-12 rounded-md border border-[var(--app-border)] p-3" href="/privacy" onClick={() => onOpenChange(false)}>Privacy</Link>
              <Link className="min-h-12 rounded-md border border-[var(--app-border)] p-3" href="/terms" onClick={() => onOpenChange(false)}>Terms</Link>
              <Link className="min-h-12 rounded-md border border-[var(--app-border)] p-3" href="/accessibility" onClick={() => onOpenChange(false)}>Accessibility</Link>
            </div>
            <p className="mt-3 px-1 text-xs text-[var(--app-subtle)]">© {new Date().getFullYear()} Relay</p>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
