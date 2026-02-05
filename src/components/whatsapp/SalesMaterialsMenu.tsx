import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, FileText, Image, Video, Loader2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onSendMedia: (url: string, type: "document" | "image" | "video", caption?: string, fileName?: string) => Promise<void>;
  disabled?: boolean;
  variant?: "icon" | "full";
}

type CategoryType = "main" | "pdf_package" | "photo" | "video";

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
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>("main");
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchMaterials();
  }, [unit]);

  // Reset category when closing
  useEffect(() => {
    if (!isOpen) {
      setActiveCategory("main");
    }
  }, [isOpen]);

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

  const getLeadGuestCount = (): number | null => {
    if (!lead?.guests) return null;
    const match = lead.guests.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  };

  const leadGuestCount = getLeadGuestCount();

  const packages = materials.filter(m => m.type === "pdf_package");
  const photos = materials.filter(m => m.type === "photo");
  const videos = materials.filter(m => m.type === "video");

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
      // Use material name as the file name for documents (adds .pdf extension)
      let fileName: string | undefined = undefined;

      if (material.type === "photo") {
        mediaType = "image";
      } else if (material.type === "video") {
        mediaType = "video";
      } else if (material.type === "pdf_package") {
        // Create a descriptive file name for PDFs
        fileName = `${material.name.replace(/[^a-zA-Z0-9\s]/g, '').trim()}.pdf`;
        if (material.guest_count) {
          caption = `📋 ${material.name} - Pacote para ${material.guest_count} pessoas`;
        }
      }

      await onSendMedia(material.file_url, mediaType, caption, fileName);
      
      toast({
        title: "Material enviado",
        description: `${material.name} foi enviado com sucesso.`,
      });
      
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o material.",
        variant: "destructive",
      });
    }
    setIsSending(null);
  };

  const hasMaterials = materials.length > 0;

  if (!hasMaterials && !isLoading) {
    return null;
  }

  const triggerButton = (
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
  );

  // Mobile: Use Sheet with internal navigation
  if (isMobile) {
    const getCategoryTitle = () => {
      switch (activeCategory) {
        case "pdf_package": return "Pacotes";
        case "photo": return "Fotos";
        case "video": return "Vídeos";
        default: return `Materiais - ${unit}`;
      }
    };

    const getCurrentItems = () => {
      switch (activeCategory) {
        case "pdf_package": return sortedPackages;
        case "photo": return photos;
        case "video": return videos;
        default: return [];
      }
    };

    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              {activeCategory !== "main" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-2"
                  onClick={() => setActiveCategory("main")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <FolderOpen className="w-4 h-4" />
              {getCategoryTitle()}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(60vh-80px)]">
            {activeCategory === "main" ? (
              // Main category list
              <div className="space-y-1 py-2">
                {sortedPackages.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12 px-3"
                    onClick={() => setActiveCategory("pdf_package")}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-red-500" />
                      <span>Pacotes</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">{sortedPackages.length}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}
                
                {photos.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12 px-3"
                    onClick={() => setActiveCategory("photo")}
                  >
                    <div className="flex items-center gap-3">
                      <Image className="w-5 h-5 text-blue-500" />
                      <span>Fotos</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">{photos.length}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}
                
                {videos.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-12 px-3"
                    onClick={() => setActiveCategory("video")}
                  >
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-purple-500" />
                      <span>Vídeos</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">{videos.length}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}
              </div>
            ) : (
              // Items list for selected category
              <div className="space-y-1 py-2">
                {getCurrentItems().map((material) => {
                  const isSuggested = leadGuestCount && material.guest_count === leadGuestCount;
                  return (
                    <Button
                      key={material.id}
                      variant="ghost"
                      className={`w-full justify-start h-auto py-3 px-3 ${isSuggested ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                      disabled={isSending === material.id}
                      onClick={() => handleSendMaterial(material)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {isSending === material.id ? (
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        ) : (
                          <>
                            {material.type === "pdf_package" && <FileText className="w-5 h-5 text-red-500 shrink-0" />}
                            {material.type === "photo" && <Image className="w-5 h-5 text-blue-500 shrink-0" />}
                            {material.type === "video" && <Video className="w-5 h-5 text-purple-500 shrink-0" />}
                          </>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="truncate text-sm font-medium">{material.name}</p>
                          {material.guest_count && (
                            <p className="text-xs text-muted-foreground">
                              {material.guest_count} pessoas
                            </p>
                          )}
                        </div>
                        {isSuggested && (
                          <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use DropdownMenu with submenus
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Materiais de Vendas - {unit}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

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
