import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Phone, Users, Calendar, Loader2 } from "lucide-react";
import { LeadFilters } from "@/pages/Admin";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  month: string | null;
  day_preference: string | null;
  guests: string | null;
  campaign_id: string;
  campaign_name: string | null;
  created_at: string;
}

interface LeadsTableProps {
  filters: LeadFilters;
  refreshKey: number;
}

export function LeadsTable({ filters, refreshKey }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoading(true);

      let query = supabase
        .from("campaign_leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.campaign && filters.campaign !== "all") {
        query = query.eq("campaign_id", filters.campaign);
      }

      if (filters.startDate) {
        query = query.gte(
          "created_at",
          filters.startDate.toISOString()
        );
      }

      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`
        );
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Erro ao buscar leads:", error);
      } else {
        setLeads(data || []);
        setTotalCount(count || 0);
      }

      setIsLoading(false);
    };

    fetchLeads();
  }, [filters, refreshKey]);

  const formatWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-display font-bold text-lg text-foreground mb-2">
          Nenhum lead encontrado
        </h3>
        <p className="text-muted-foreground">
          {filters.search || filters.campaign !== "all" || filters.startDate || filters.endDate
            ? "Tente ajustar os filtros para ver mais resultados."
            : "Os leads capturados aparecerão aqui."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">
            {totalCount} lead{totalCount !== 1 ? "s" : ""} encontrado
            {totalCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Mês</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Convidados</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {lead.whatsapp}
                  </div>
                </TableCell>
                <TableCell>
                  {lead.month ? (
                    <Badge variant="secondary">{lead.month}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.day_preference ? (
                    <Badge variant="outline">{lead.day_preference}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.guests ? (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {lead.guests}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                    {lead.campaign_id}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={formatWhatsAppLink(lead.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      WhatsApp
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
