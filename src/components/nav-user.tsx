"use client";

import Link from "next/link";
import { ChevronsUpDown, Home, LogOut, UserRound } from "@/components/icons";

import { signOut } from "@/server/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavUserProps = {
  user: {
    name: string;
    email: string;
  };
  compact?: boolean;
};

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "O";
}

export function NavUser({ user, compact = false }: NavUserProps) {
  const { isMobile } = useSidebar();
  const initial = getInitial(user.name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className={
                  compact
                    ? "bg-sidebar-accent text-sidebar-accent-foreground data-open:bg-sidebar-accent hover:bg-sidebar-accent justify-center font-semibold shadow-xs group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:p-0! md:h-10 md:p-0"
                    : "data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                }
              />
            }
          >
            {compact ? (
              <span className="text-sidebar-accent-foreground flex size-full items-center justify-center text-sm font-semibold">
                {initial}
              </span>
            ) : (
              <Avatar className="bg-sidebar-accent ring-sidebar-border size-9 rounded-xl shadow-xs ring-1 after:rounded-xl">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground rounded-xl text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={
                compact
                  ? "sr-only"
                  : "grid min-w-0 flex-1 text-left text-sm leading-tight"
              }
            >
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>

            {!compact ? <ChevronsUpDown className="ml-auto size-4" /> : null}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-72 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3 py-1.5">
                  <Avatar className="bg-sidebar-accent ring-sidebar-border size-10 rounded-xl shadow-sm ring-1 after:rounded-xl">
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground rounded-xl font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-xs">
                <UserRound className="size-4" />
                Supabase authenticated
              </div>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem render={<Link href="/" />}>
              <Home className="size-4" />
              Landing page
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <form action={signOut}>
              <button
                type="submit"
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
