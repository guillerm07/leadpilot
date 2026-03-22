"use client";

import { createContext, useContext, useState, useCallback } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
};

type ClientContextType = {
  clients: Client[];
  activeClient: Client | null;
  setActiveClient: (client: Client) => void;
};

const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({
  children,
  initialClients,
  initialClientId,
}: {
  children: React.ReactNode;
  initialClients: Client[];
  initialClientId?: string;
}) {
  const [activeClient, setActiveClientState] = useState<Client | null>(
    initialClients.find((c) => c.id === initialClientId) || initialClients[0] || null
  );

  const setActiveClient = useCallback((client: Client) => {
    setActiveClientState(client);
    document.cookie = `active_client_id=${client.id};path=/;max-age=31536000`;
  }, []);

  return (
    <ClientContext.Provider value={{ clients: initialClients, activeClient, setActiveClient }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) throw new Error("useClient must be used within ClientProvider");
  return context;
}
