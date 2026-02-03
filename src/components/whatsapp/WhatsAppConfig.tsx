import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Wifi, MessageSquare, Bell, Bot, Settings } from "lucide-react";
import { ConnectionSection } from "./settings/ConnectionSection";
import { MessagesSection } from "./settings/MessagesSection";
import { NotificationsSection } from "./settings/NotificationsSection";
import { AutomationsSection } from "./settings/AutomationsSection";
import { AdvancedSection } from "./settings/AdvancedSection";

interface WhatsAppConfigProps {
  userId: string;
  isAdmin: boolean;
}

const configSections = [
  {
    id: "connection",
    title: "Conexão",
    description: "Status das instâncias e QR Code",
    icon: Wifi,
  },
  {
    id: "messages",
    title: "Mensagens",
    description: "Templates de resposta rápida",
    icon: MessageSquare,
  },
  {
    id: "notifications",
    title: "Notificações",
    description: "Som e alertas do navegador",
    icon: Bell,
  },
  {
    id: "automations",
    title: "Automações",
    description: "Chatbot e respostas automáticas",
    icon: Bot,
  },
  {
    id: "advanced",
    title: "Avançado",
    description: "Sincronização e logs",
    icon: Settings,
  },
];

export function WhatsAppConfig({ userId, isAdmin }: WhatsAppConfigProps) {
  return (
    <div className="space-y-4">
      <Accordion 
        type="single" 
        collapsible 
        defaultValue="connection"
        className="space-y-3"
      >
        {configSections.map((section) => (
          <AccordionItem 
            key={section.id} 
            value={section.id}
            className="border rounded-lg bg-card px-4 data-[state=open]:bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{section.title}</p>
                  <p className="text-sm text-muted-foreground font-normal">
                    {section.description}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              {section.id === "connection" && (
                <ConnectionSection userId={userId} isAdmin={isAdmin} />
              )}
              {section.id === "messages" && (
                <MessagesSection userId={userId} isAdmin={isAdmin} />
              )}
              {section.id === "notifications" && (
                <NotificationsSection />
              )}
              {section.id === "automations" && (
                <AutomationsSection />
              )}
              {section.id === "advanced" && (
                <AdvancedSection userId={userId} isAdmin={isAdmin} />
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
