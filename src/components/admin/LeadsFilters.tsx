import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Search, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LeadFilters } from "@/pages/Admin";
import { LEAD_STATUS_LABELS, UserWithRole } from "@/types/crm";

interface LeadsFiltersProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  responsaveis: UserWithRole[];
  onExport: () => void;
}

export function LeadsFilters({
  filters,
  onFiltersChange,
  responsaveis,
  onExport,
}: LeadsFiltersProps) {
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    const fetchFiltersData = async () => {
      const { data } = await supabase
        .from("campaign_leads")
        .select("campaign_id, unit, month")
        .order("campaign_id");

      if (data) {
        const uniqueCampaigns = [...new Set(data.map((d) => d.campaign_id))];
        const uniqueUnits = [
          ...new Set(data.map((d) => d.unit).filter(Boolean)),
        ] as string[];
        const uniqueMonths = [
          ...new Set(data.map((d) => d.month).filter(Boolean)),
        ] as string[];
        setCampaigns(uniqueCampaigns);
        setUnits(uniqueUnits);
        setMonths(uniqueMonths);
      }
    };

    fetchFiltersData();
  }, []);

  const clearFilters = () => {
    onFiltersChange({
      campaign: "all",
      unit: "all",
      status: "all",
      responsavel: "all",
      month: "all",
      startDate: undefined,
      endDate: undefined,
      search: "",
    });
  };

  const hasActiveFilters =
    filters.campaign !== "all" ||
    filters.unit !== "all" ||
    filters.status !== "all" ||
    filters.responsavel !== "all" ||
    filters.month !== "all" ||
    filters.startDate ||
    filters.endDate ||
    filters.search;

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Row 1: Search and Export */}
        <div className="flex gap-2 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                className="pl-10 text-sm"
              />
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={onExport}>
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        </div>

        {/* Mobile: Toggle filters button */}
        <div className="sm:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="w-full justify-between text-muted-foreground"
          >
            <span>Filtros {hasActiveFilters && `(${Object.values(filters).filter(v => v && v !== 'all').length} ativos)`}</span>
            <span>{isFiltersExpanded ? '▲' : '▼'}</span>
          </Button>
        </div>

        {/* Row 2: Filters - Hidden on mobile unless expanded */}
        <div className={cn(
          "flex-col sm:flex sm:flex-row sm:flex-wrap gap-2 sm:gap-3",
          isFiltersExpanded ? "flex" : "hidden sm:flex"
        )}>
          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value })
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Unit Filter */}
          <Select
            value={filters.unit}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, unit: value })
            }
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas unidades</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Campaign Filter */}
          <Select
            value={filters.campaign}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, campaign: value })
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas campanhas</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign} value={campaign}>
                  {campaign}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Responsavel Filter */}
          <Select
            value={filters.responsavel}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, responsavel: value })
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              <SelectItem value="unassigned">Não atribuído</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r.user_id} value={r.user_id}>
                  {r.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Filter */}
          <Select
            value={filters.month}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, month: value })
            }
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Mês evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos meses</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date filters row */}
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Start Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 sm:flex-none sm:w-32 justify-start text-left font-normal text-sm",
                    !filters.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {filters.startDate ? (
                    format(filters.startDate, "dd/MM/yy")
                  ) : (
                    <span>De</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, startDate: date })
                  }
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* End Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 sm:flex-none sm:w-32 justify-start text-left font-normal text-sm",
                    !filters.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {filters.endDate ? (
                    format(filters.endDate, "dd/MM/yy")
                  ) : (
                    <span>Até</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, endDate: date })
                  }
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
