"use client";

import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";

import { signOut } from "@/app/app/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
    avatar?: string;
  };
  compact?: boolean;
};

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "OE";
}

export function NavUser({ user, compact = false }: NavUserProps) {
  const { isMobile } = useSidebar();
  const initials = getInitials(user.name);

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
                    ? "data-open:bg-sidebar-accent md:h-8 md:p-0"
                    : "data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                }
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>

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
            className="min-w-64 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3 py-1.5">
                <Avatar className="size-8 rounded-lg">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials}
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

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-xs">
                <UserRound className="size-4" />
                Supabase authenticated
              </div>
            </DropdownMenuGroup>

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
