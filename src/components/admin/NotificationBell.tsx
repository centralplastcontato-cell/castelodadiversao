import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, UserPlus, ArrowRightLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppNotifications, AppNotification } from "@/hooks/useAppNotifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    clientAlertCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useAppNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "lead_transfer":
        return <ArrowRightLeft className="w-4 h-4 text-primary" />;
      case "existing_client":
        return <Crown className="w-4 h-4 text-amber-500" />;
      case "lead_assigned":
        return <UserPlus className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === "existing_client" && notification.data && typeof notification.data === "object") {
      // Open conversation for client alerts
      if ("contact_phone" in notification.data) {
        setIsOpen(false);
        navigate(`/atendimento?phone=${notification.data.contact_phone}`);
      }
    } else if (notification.data && typeof notification.data === "object" && "lead_id" in notification.data) {
      setIsOpen(false);
      navigate(`/atendimento?lead=${notification.data.lead_id}`);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 flex items-center gap-0.5">
              {clientAlertCount > 0 && (
                <Badge
                  className={cn(
                    "h-5 min-w-5 px-1 text-xs",
                    "bg-amber-500 text-white hover:bg-amber-500",
                    "animate-pulse"
                  )}
                >
                  {clientAlertCount > 9 ? "9+" : clientAlertCount}
                </Badge>
              )}
              {(unreadCount - clientAlertCount) > 0 && (
                <Badge
                  className={cn(
                    "h-5 min-w-5 px-1 text-xs",
                    "bg-primary text-primary-foreground",
                    clientAlertCount === 0 && "animate-pulse"
                  )}
                >
                  {(unreadCount - clientAlertCount) > 99 ? "99+" : (unreadCount - clientAlertCount)}
                </Badge>
              )}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notificações</h4>
            {clientAlertCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                <Crown className="w-3 h-3" />
                {clientAlertCount} cliente{clientAlertCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm",
                            !notification.read && "font-medium"
                          )}
                        >
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(
                          new Date(notification.created_at),
                          "dd/MM 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
