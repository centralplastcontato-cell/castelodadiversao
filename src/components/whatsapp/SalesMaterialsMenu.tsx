import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, FileText, Image, Video, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SalesMaterial {
  id: string;
  unit: string;
  type: "pdf_package" | "photo" | "video";
  name: string;
  guest_count: number | null;
  file_url: string;
  is_active: boolean;
}

interface Lead {
  id: string;
  name: string;
  guests?: string | null;
  unit?: string | null;
  month?: string | null;
  day_of_month?: number | null;
}

interface SalesMaterialsMenuProps {
  unit: string;
  lead?: Lead | null;
  onSendMedia: (url: string, type: "document" | "image" | "video", caption?: string) => Promise<void>;
  disabled?: boolean;
  variant?: "icon" | "full";
}

export function SalesMaterialsMenu({ 
  unit, 
  lead, 
  onSendMedia, 
  disabled = false,
  variant = "icon"
}: SalesMaterialsMenuProps) {
  const [materials, setMaterials] = useState<SalesMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, [unit]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("sales_materials")
      .select("*")
      .eq("unit", unit)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) {
      setMaterials(data as SalesMaterial[]);
    }
    setIsLoading(false);
  };

  // Parse guest count from lead data (e.g., "50 pessoas" -> 50)
  const getLeadGuestCount = (): number | null => {
    if (!lead?.guests) return null;
    const match = lead.guests.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  };

  const leadGuestCount = getLeadGuestCount();

  // Group materials by type
  const packages = materials.filter(m => m.type === "pdf_package");
  const photos = materials.filter(m => m.type === "photo");
  const videos = materials.filter(m => m.type === "video");

  // Sort packages to show suggested one first
  const sortedPackages = [...packages].sort((a, b) => {
    if (leadGuestCount) {
      const aMatch = a.guest_count === leadGuestCount;
      const bMatch = b.guest_count === leadGuestCount;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return (a.guest_count || 0) - (b.guest_count || 0);
  });

  const handleSendMaterial = async (material: SalesMaterial) => {
    setIsSending(material.id);
    try {
      let mediaType: "document" | "image" | "video" = "document";
      let caption = material.name;

      if (material.type === "photo") {
        mediaType = "image";
      } else if (material.type === "video") {
        mediaType = "video";
      } else if (material.type === "pdf_package") {
        // Add context for packages
        if (material.guest_count) {
          caption = `📋 ${material.name} - Pacote para ${material.guest_count} pessoas`;
        }
      }

      await onSendMedia(material.file_url, mediaType, caption);
      
      toast({
        title: "Material enviado",
        description: `${material.name} foi enviado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o material.",
        variant: "destructive",
      });
    }
    setIsSending(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf_package":
        return <FileText className="w-4 h-4 text-red-500" />;
      case "photo":
        return <Image className="w-4 h-4 text-blue-500" />;
      case "video":
        return <Video className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const hasMaterials = materials.length > 0;

  if (!hasMaterials && !isLoading) {
    return null; // Don't show button if no materials
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={variant === "icon" ? "icon" : "sm"}
          disabled={disabled || isLoading}
          className={variant === "icon" ? "shrink-0 h-9 w-9" : "shrink-0"}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <FolderOpen className="w-4 h-4" />
              {variant === "full" && <span className="ml-2">Materiais</span>}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Materiais de Vendas - {unit}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Packages submenu */}
        {sortedPackages.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileText className="w-4 h-4 mr-2 text-red-500" />
              Pacotes ({sortedPackages.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {sortedPackages.map((material) => {
                const isSuggested = leadGuestCount && material.guest_count === leadGuestCount;
                return (
                  <DropdownMenuItem
                    key={material.id}
                    onClick={() => handleSendMaterial(material)}
                    disabled={isSending === material.id}
                    className={isSuggested ? "bg-primary/10 border-l-2 border-primary" : ""}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {isSending === material.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm">{material.name}</p>
                        {material.guest_count && (
                          <p className="text-xs text-muted-foreground">
                            {material.guest_count} pessoas
                          </p>
                        )}
                      </div>
                      {isSuggested && (
                        <Sparkles className="w-3 h-3 text-primary shrink-0" />
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Photos submenu */}
        {photos.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Image className="w-4 h-4 mr-2 text-blue-500" />
              Fotos ({photos.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {photos.map((material) => (
                <DropdownMenuItem
                  key={material.id}
                  onClick={() => handleSendMaterial(material)}
                  disabled={isSending === material.id}
                >
                  {isSending === material.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Image className="w-4 h-4 mr-2 text-blue-500" />
                  )}
                  <span className="truncate">{material.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Videos submenu */}
        {videos.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Video className="w-4 h-4 mr-2 text-purple-500" />
              Vídeos ({videos.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {videos.map((material) => (
                <DropdownMenuItem
                  key={material.id}
                  onClick={() => handleSendMaterial(material)}
                  disabled={isSending === material.id}
                >
                  {isSending === material.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4 mr-2 text-purple-500" />
                  )}
                  <span className="truncate">{material.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {!hasMaterials && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nenhum material configurado para {unit}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
