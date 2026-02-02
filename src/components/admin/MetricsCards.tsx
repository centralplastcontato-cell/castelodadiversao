import { Card, CardContent } from "@/components/ui/card";
import { Lead, LeadStatus, LEAD_STATUS_LABELS } from "@/types/crm";
import { Users, UserPlus, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsCardsProps {
  leads: Lead[];
  isLoading: boolean;
}

export function MetricsCards({ leads, isLoading }: MetricsCardsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalLeads = leads.length;
  const leadsToday = leads.filter((lead) => {
    const createdAt = new Date(lead.created_at);
    createdAt.setHours(0, 0, 0, 0);
    return createdAt.getTime() === today.getTime();
  }).length;

  const leadsByStatus = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<LeadStatus, number>);

  const newLeads = leadsByStatus["novo"] || 0;
  const inContact = leadsByStatus["em_contato"] || 0;
  const closed = leadsByStatus["fechado"] || 0;
  const lost = leadsByStatus["perdido"] || 0;

  const conversionRate = totalLeads > 0 ? ((closed / totalLeads) * 100).toFixed(1) : "0";

  const metrics = [
    {
      title: "Total de Leads",
      value: totalLeads,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Leads Hoje",
      value: leadsToday,
      icon: UserPlus,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Novos",
      value: newLeads,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Em Contato",
      value: inContact,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Fechados",
      value: closed,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Perdidos",
      value: lost,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {metrics.map((metric) => (
        <Card 
          key={metric.title} 
          className="border-border/50 hover:border-primary/30 transition-colors"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${metric.bgColor}`}>
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
              </div>
              <span className="text-xs text-muted-foreground font-medium truncate">
                {metric.title}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
