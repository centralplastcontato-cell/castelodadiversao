import { useState } from "react";
import { Wifi, MessageSquare, Bell, Bot, Settings } from "lucide-react";
import { ConnectionSection } from "./settings/ConnectionSection";
import { MessagesSection } from "./settings/MessagesSection";
import { NotificationsSection } from "./settings/NotificationsSection";
import { AutomationsSection } from "./settings/AutomationsSection";
import { AdvancedSection } from "./settings/AdvancedSection";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WhatsAppConfigProps {
  userId: string;
  isAdmin: boolean;
}

const configSections = [
  {
    id: "connection",
    title: "Conexão",
    description: "Status e QR Code",
    icon: Wifi,
  },
  {
    id: "messages",
    title: "Mensagens",
    description: "Templates rápidos",
    icon: MessageSquare,
  },
  {
    id: "notifications",
    title: "Notificações",
    description: "Som e alertas",
    icon: Bell,
  },
  {
    id: "automations",
    title: "Automações",
    description: "Chatbot e respostas",
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
  const [activeSection, setActiveSection] = useState("connection");

  const renderContent = () => {
    switch (activeSection) {
      case "connection":
        return <ConnectionSection userId={userId} isAdmin={isAdmin} />;
      case "messages":
        return <MessagesSection userId={userId} isAdmin={isAdmin} />;
      case "notifications":
        return <NotificationsSection />;
      case "automations":
        return <AutomationsSection />;
      case "advanced":
        return <AdvancedSection userId={userId} isAdmin={isAdmin} />;
      default:
        return <ConnectionSection userId={userId} isAdmin={isAdmin} />;
    }
  };

  const activeConfig = configSections.find(s => s.id === activeSection);

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      {/* Sidebar Menu - Vertical on desktop, horizontal scroll on mobile */}
      <div className="md:w-56 shrink-0">
        {/* Mobile: Horizontal scrollable tabs */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex gap-2 pb-2 min-w-max">
              {configSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors shrink-0",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <section.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Desktop: Vertical sidebar */}
        <nav className="hidden md:flex flex-col gap-1 bg-muted/30 rounded-lg p-2">
          {configSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left w-full",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                activeSection === section.id
                  ? "bg-primary-foreground/20"
                  : "bg-primary/10"
              )}>
                <section.icon className={cn(
                  "w-4 h-4",
                  activeSection === section.id
                    ? "text-primary-foreground"
                    : "text-primary"
                )} />
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "font-medium text-sm truncate",
                  activeSection === section.id
                    ? "text-primary-foreground"
                    : "text-foreground"
                )}>
                  {section.title}
                </p>
                <p className={cn(
                  "text-xs truncate",
                  activeSection === section.id
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}>
                  {section.description}
                </p>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {/* Section Header */}
        <div className="mb-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            {activeConfig && (
              <>
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <activeConfig.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{activeConfig.title}</h2>
                  <p className="text-sm text-muted-foreground">{activeConfig.description}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section Content */}
        <ScrollArea className="h-[calc(100vh-300px)] md:h-[calc(100vh-280px)]">
          {renderContent()}
        </ScrollArea>
      </div>
    </div>
  );
}
