"use client";

import { useRouter } from "next/navigation";
import { LogOut, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClient } from "@/components/layout/client-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";

export function Header({ userEmail }: { userEmail?: string }) {
  const router = useRouter();
  const { clients, activeClient, setActiveClient } = useClient();

  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase()
    : "U";

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Left: Logo text (visible on mobile or as breadcrumb area) */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground">LeadPilot</span>
      </div>

      {/* Center: Client selector */}
      <div className="flex items-center">
        {clients.length > 0 ? (
          <Select
            value={activeClient?.id}
            onValueChange={(value) => {
              const client = clients.find((c) => c.id === value);
              if (client) setActiveClient(client);
            }}
          >
            <SelectTrigger
              className={cn(
                "h-9 min-w-[200px] gap-2 border-border bg-secondary text-sm font-medium",
                "hover:bg-accent transition-colors"
              )}
            >
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Seleccionar cliente">
                {activeClient?.name ?? "Seleccionar cliente"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">Sin clientes</span>
        )}
      </div>

      {/* Right: User menu */}
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent outline-none"
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {userEmail && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {userEmail}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">Mi cuenta</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
            >
              <User className="size-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
