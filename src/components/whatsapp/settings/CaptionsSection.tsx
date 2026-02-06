import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, MessageSquare, Video, Images, Sparkles } from "lucide-react";

interface Caption {
  id: string;
  unit: string;
  caption_type: "video" | "video_promo" | "photo_collection";
  caption_text: string;
  is_active: boolean;
}

interface CaptionsSectionProps {
  userId: string;
  isAdmin: boolean;
}

const CAPTION_TYPES = [
  { 
    value: "video", 
    label: "Vídeos", 
    icon: Video,
    description: "Legenda enviada junto com vídeos do espaço"
  },
  { 
    value: "video_promo", 
    label: "Vídeos Promocionais", 
    icon: Sparkles,
    description: "Legenda para vídeos de promoção (ex: carnaval)"
  },
  { 
    value: "photo_collection", 
    label: "Coleções de Fotos", 
    icon: Images,
    description: "Legenda enviada junto com cada foto da coleção"
  },
] as const;

const UNITS = ["Manchester", "Trujillo"];

export function CaptionsSection({ userId: _userId, isAdmin: _isAdmin }: CaptionsSectionProps) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [selectedUnit, setSelectedUnit] = useState<string>("Manchester");

  useEffect(() => {
    fetchCaptions();
  }, []);

  const fetchCaptions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales_material_captions")
        .select("*")
        .order("unit", { ascending: true });

      if (error) {
        console.error("[CaptionsSection] Error fetching captions:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as legendas.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        // Filter valid caption types
        const validTypes = ["video", "video_promo", "photo_collection"];
        const validCaptions = data.filter(c => validTypes.includes(c.caption_type)) as Caption[];
        setCaptions(validCaptions);
        // Initialize edited captions with current values
        const edited: Record<string, string> = {};
        validCaptions.forEach((caption) => {
          edited[caption.id] = caption.caption_text;
        });
        setEditedCaptions(edited);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCaption = async (caption: Caption) => {
    const newText = editedCaptions[caption.id];
    if (newText === caption.caption_text) {
      toast({
        title: "Sem alterações",
        description: "O texto não foi modificado.",
      });
      return;
    }

    if (!newText?.trim()) {
      toast({
        title: "Erro",
        description: "A legenda não pode estar vazia.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(caption.id);
    try {
      const { error } = await supabase
        .from("sales_material_captions")
        .update({ caption_text: newText.trim() })
        .eq("id", caption.id);

      if (error) throw error;

      // Update local state
      setCaptions(captions.map(c => 
        c.id === caption.id ? { ...c, caption_text: newText.trim() } : c
      ));

      toast({
        title: "Sucesso",
        description: "Legenda atualizada com sucesso!",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar legenda.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  const getCaptionForType = (unit: string, type: string): Caption | undefined => {
    return captions.find(c => c.unit === unit && c.caption_type === type);
  };

  const hasChanges = (captionId: string, originalText: string): boolean => {
    return editedCaptions[captionId] !== originalText;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Legendas de Materiais
        </CardTitle>
        <CardDescription>
          Personalize as legendas enviadas junto com vídeos e coleções de fotos. 
          Cada unidade pode ter textos diferentes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedUnit} onValueChange={setSelectedUnit}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            {UNITS.map(unit => (
              <TabsTrigger key={unit} value={unit}>
                {unit}
              </TabsTrigger>
            ))}
          </TabsList>

          {UNITS.map(unit => (
            <TabsContent key={unit} value={unit} className="space-y-6">
              {CAPTION_TYPES.map(({ value, label, icon: Icon, description }) => {
                const caption = getCaptionForType(unit, value);
                if (!caption) return null;

                const currentText = editedCaptions[caption.id] || "";
                const isModified = hasChanges(caption.id, caption.caption_text);
                const isSavingThis = isSaving === caption.id;

                return (
                  <div key={value} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <Label className="text-base font-medium">{label}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    
                    <Textarea
                      value={currentText}
                      onChange={(e) => setEditedCaptions({
                        ...editedCaptions,
                        [caption.id]: e.target.value
                      })}
                      placeholder="Digite a legenda..."
                      className="min-h-[100px] resize-none"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {currentText.length} caracteres
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleSaveCaption(caption)}
                        disabled={!isModified || isSavingThis}
                      >
                        {isSavingThis ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
