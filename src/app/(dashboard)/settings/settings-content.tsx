"use client";

import { useActionState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updatePasswordAction, updateWorkspaceAction } from "./actions";

interface SettingsContentProps {
  userEmail: string;
  workspaceName: string;
}

const initialState = { success: false, error: null as string | null };

export function SettingsContent({ userEmail, workspaceName }: SettingsContentProps) {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updatePasswordAction,
    initialState
  );

  const [workspaceState, workspaceAction, workspacePending] = useActionState(
    updateWorkspaceAction,
    initialState
  );

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Perfil</TabsTrigger>
        <TabsTrigger value="workspace">Workspace</TabsTrigger>
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile">
        <div className="space-y-6 mt-4">
          {/* Email (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>Email</CardTitle>
              <CardDescription>
                Tu dirección de correo electrónico asociada a la cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input value={userEmail} disabled />
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Cambiar contraseña</CardTitle>
              <CardDescription>
                Introduce una nueva contraseña para tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={passwordAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Repite la contraseña"
                    required
                    minLength={8}
                  />
                </div>

                {passwordState.error && (
                  <p className="text-sm text-red-600">{passwordState.error}</p>
                )}
                {passwordState.success && (
                  <p className="text-sm text-green-600">
                    Contraseña actualizada correctamente.
                  </p>
                )}

                <Button type="submit" disabled={passwordPending}>
                  {passwordPending ? "Guardando..." : "Actualizar contraseña"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Workspace Tab */}
      <TabsContent value="workspace">
        <div className="space-y-6 mt-4">
          {/* Workspace Name */}
          <Card>
            <CardHeader>
              <CardTitle>Nombre del workspace</CardTitle>
              <CardDescription>
                Este nombre aparecerá en la cabecera de la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={workspaceAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Nombre</Label>
                  <Input
                    id="workspaceName"
                    name="name"
                    defaultValue={workspaceName}
                    placeholder="Mi Agencia"
                    required
                  />
                </div>

                {workspaceState.error && (
                  <p className="text-sm text-red-600">{workspaceState.error}</p>
                )}
                {workspaceState.success && (
                  <p className="text-sm text-green-600">
                    Workspace actualizado correctamente.
                  </p>
                )}

                <Button type="submit" disabled={workspacePending}>
                  {workspacePending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Logo Upload (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Logo del workspace</CardTitle>
              <CardDescription>
                Sube el logo de tu agencia. Se mostrará en la barra lateral.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted">
                  <span className="text-xs text-muted-foreground">Logo</span>
                </div>
                <div>
                  <Button variant="outline" disabled>
                    Subir imagen
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG o SVG. Máximo 1MB. Próximamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
