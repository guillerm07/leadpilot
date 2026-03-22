import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { requireAuth } from "@/lib/auth/helpers";
import {
  getClientById,
  getComplianceSettings,
} from "@/lib/db/queries/clients";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientSettingsForm } from "@/components/clients/client-settings-form";
import { ClientBrandForm } from "@/components/clients/client-brand-form";
import { ClientIntegrationsForm } from "@/components/clients/client-integrations-form";
import { ClientComplianceForm } from "@/components/clients/client-compliance-form";
import { EmailWarmup } from "@/components/clients/email-warmup";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  return {
    title: client
      ? `${client.name} — Ajustes | LeadPilot`
      : "Cliente no encontrado | LeadPilot",
  };
}

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  const compliance = await getComplianceSettings(client.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/clients"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a clientes
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            {client.logoUrl ? (
              <img
                src={client.logoUrl}
                alt={client.name}
                className="size-10 rounded-lg object-cover"
              />
            ) : (
              <Building2 className="size-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {client.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Configuración del cliente
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="brand">Marca</TabsTrigger>
          <TabsTrigger value="integrations">Integraciones</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>
                Datos básicos del cliente. El nombre se usa para identificar
                al cliente en toda la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientSettingsForm
                client={{
                  id: client.id,
                  name: client.name,
                  website: client.website,
                  industry: client.industry,
                  country: client.country,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Tab */}
        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle>Identidad de marca</CardTitle>
              <CardDescription>
                Esta información se usa para personalizar el contenido
                generado por IA: emails, mensajes de WhatsApp, landing pages
                y guiones de vídeo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientBrandForm
                client={{
                  id: client.id,
                  brandDescription: client.brandDescription,
                  brandVoice: client.brandVoice,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integraciones</CardTitle>
                <CardDescription>
                  Claves API específicas de este cliente. Se almacenan
                  encriptadas. Las claves globales (Claude, Outscraper, etc.)
                  se configuran a nivel de workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClientIntegrationsForm
                  client={{
                    id: client.id,
                    instantlyApiKeyEncrypted: client.instantlyApiKeyEncrypted,
                    brevoApiKeyEncrypted: client.brevoApiKeyEncrypted,
                    brevoSenderEmail: client.brevoSenderEmail,
                    brevoSenderName: client.brevoSenderName,
                  }}
                />
              </CardContent>
            </Card>

            {/* Email Warmup */}
            <Card>
              <CardHeader>
                <CardTitle>Email Warmup</CardTitle>
                <CardDescription>
                  Estado de calentamiento de los dominios de envio. Los
                  datos se sincronizan desde Instantly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailWarmup
                  domains={
                    client.brevoSenderEmail
                      ? [
                          {
                            domain: client.brevoSenderEmail.split("@")[1] ?? "sin-dominio",
                            startDate: client.createdAt,
                            emailsSentToday: 0,
                            dailyLimit: 10,
                            replyRate: 0,
                            bounceRate: 0,
                            spfConfigured: false,
                            dkimConfigured: false,
                            dmarcConfigured: false,
                          },
                        ]
                      : []
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance y privacidad</CardTitle>
              <CardDescription>
                Configuración de cumplimiento normativo (GDPR, LSSI,
                CAN-SPAM). Estos ajustes se aplican a todos los envíos de
                este cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientComplianceForm
                clientId={client.id}
                compliance={
                  compliance
                    ? {
                        listaRobinsonEnabled:
                          compliance.listaRobinsonEnabled,
                        unsubscribeUrlTemplate:
                          compliance.unsubscribeUrlTemplate,
                        senderPhysicalAddress:
                          compliance.senderPhysicalAddress,
                        privacyPolicyUrl: compliance.privacyPolicyUrl,
                        dpoContactEmail: compliance.dpoContactEmail,
                      }
                    : null
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
