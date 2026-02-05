import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FileText, Image, Video, Plus, Pencil, Trash2, Loader2, Upload, FolderOpen } from "lucide-react";

interface SalesMaterial {
  id: string;
  unit: string;
  type: "pdf_package" | "photo" | "video";
  name: string;
  guest_count: number | null;
  file_url: string;
  file_path: string | null;
  sort_order: number;
  is_active: boolean;
}

interface SalesMaterialsSectionProps {
  userId: string;
  isAdmin: boolean;
}

const GUEST_OPTIONS = [50, 60, 70, 80, 90, 100];
const UNITS = ["Manchester", "Trujillo"];

export function SalesMaterialsSection({ userId, isAdmin }: SalesMaterialsSectionProps) {
  const [materials, setMaterials] = useState<SalesMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<SalesMaterial | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("Manchester");
  const [selectedType, setSelectedType] = useState<string>("pdf_package");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "pdf_package" as "pdf_package" | "photo" | "video",
    guest_count: null as number | null,
    file_url: "",
    file_path: null as string | null,
    is_active: true,
    unit: null as string | null,
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("sales_materials")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) {
      setMaterials(data as SalesMaterial[]);
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes: Record<string, string[]> = {
      pdf_package: ["application/pdf"],
      photo: ["image/jpeg", "image/png", "image/webp"],
      video: ["video/mp4", "video/quicktime", "video/webm"],
    };

    if (!allowedTypes[formData.type].includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: `Apenas ${formData.type === "pdf_package" ? "PDFs" : formData.type === "photo" ? "imagens" : "vídeos"} são permitidos.`,
        variant: "destructive",
      });
      return;
    }

    // Max size: 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 50MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedUnit.toLowerCase()}/${formData.type}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("sales-materials")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("sales-materials")
        .getPublicUrl(fileName);

      setFormData({
        ...formData,
        file_url: urlData.publicUrl,
        file_path: fileName,
        name: formData.name || file.name.replace(/\.[^/.]+$/, ""),
      });

      toast({
        title: "Upload concluído",
        description: "Arquivo enviado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao enviar arquivo.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveMaterial = async () => {
    if (!formData.name || !formData.file_url) {
      toast({
        title: "Erro",
        description: "Preencha o nome e faça upload do arquivo.",
        variant: "destructive",
      });
      return;
    }

    if (formData.type === "pdf_package" && !formData.guest_count) {
      toast({
        title: "Erro",
        description: "Selecione a quantidade de convidados para o pacote.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingMaterial) {
        const { error } = await supabase
          .from("sales_materials")
          .update({
            name: formData.name,
            type: formData.type,
            guest_count: formData.type === "pdf_package" ? formData.guest_count : null,
            file_url: formData.file_url,
            file_path: formData.file_path,
            is_active: formData.is_active,
            unit: formData.unit || editingMaterial.unit,
          })
          .eq("id", editingMaterial.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Material atualizado com sucesso!",
        });
      } else {
        const unitMaterials = materials.filter(m => m.unit === selectedUnit && m.type === formData.type);
        const maxOrder = unitMaterials.length > 0 
          ? Math.max(...unitMaterials.map(m => m.sort_order)) + 1 
          : 0;

        const { error } = await supabase
          .from("sales_materials")
          .insert({
            unit: selectedUnit,
            name: formData.name,
            type: formData.type,
            guest_count: formData.type === "pdf_package" ? formData.guest_count : null,
            file_url: formData.file_url,
            file_path: formData.file_path,
            is_active: formData.is_active,
            sort_order: maxOrder,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Material adicionado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar material.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  const handleDeleteMaterial = async (material: SalesMaterial) => {
    if (!confirm(`Tem certeza que deseja excluir "${material.name}"?`)) {
      return;
    }

    try {
      // Delete from storage if path exists
      if (material.file_path) {
        await supabase.storage
          .from("sales-materials")
          .remove([material.file_path]);
      }

      const { error } = await supabase
        .from("sales_materials")
        .delete()
        .eq("id", material.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Material excluído com sucesso.",
      });

      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir material.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (material: SalesMaterial) => {
    try {
      const { error } = await supabase
        .from("sales_materials")
        .update({ is_active: !material.is_active })
        .eq("id", material.id);

      if (error) throw error;

      setMaterials(materials.map(m => 
        m.id === material.id ? { ...m, is_active: !m.is_active } : m
      ));
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar material.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (material?: SalesMaterial) => {
    if (material) {
      setEditingMaterial(material);
      setSelectedUnit(material.unit);
      setFormData({
        name: material.name,
        type: material.type,
        guest_count: material.guest_count,
        file_url: material.file_url,
        file_path: material.file_path,
        is_active: material.is_active,
        unit: material.unit,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingMaterial(null);
    setFormData({
      name: "",
      type: "pdf_package",
      guest_count: null,
      file_url: "",
      file_path: null,
      is_active: true,
      unit: null,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf_package":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "photo":
        return <Image className="w-5 h-5 text-blue-500" />;
      case "video":
        return <Video className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "pdf_package":
        return "PDF de Pacote";
      case "photo":
        return "Foto";
      case "video":
        return "Vídeo";
      default:
        return type;
    }
  };

  const filteredMaterials = materials.filter(
    m => m.unit === selectedUnit && m.type === selectedType
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="w-5 h-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <CardTitle className="text-base">Materiais</CardTitle>
                <CardDescription className="text-xs">PDFs, fotos e vídeos</CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pt-0">
          {/* Unit selector */}
          <div className="mb-4">
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map(unit => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type tabs */}
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="grid w-full grid-cols-3 mb-3 h-9">
              <TabsTrigger value="pdf_package" className="text-xs px-2">
                <FileText className="w-3.5 h-3.5 mr-1" />
                PDFs
              </TabsTrigger>
              <TabsTrigger value="photo" className="text-xs px-2">
                <Image className="w-3.5 h-3.5 mr-1" />
                Fotos
              </TabsTrigger>
              <TabsTrigger value="video" className="text-xs px-2">
                <Video className="w-3.5 h-3.5 mr-1" />
                Vídeos
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedType} className="mt-0">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-6 border rounded-lg border-dashed">
                  <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                    {getTypeIcon(selectedType)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Nenhum material</p>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredMaterials.map((material) => (
                    <div 
                      key={material.id} 
                      className={`flex items-center gap-2 p-2 border rounded-lg ${!material.is_active ? 'opacity-50' : ''}`}
                    >
                      {getTypeIcon(material.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{material.name}</p>
                        {material.guest_count && (
                          <p className="text-xs text-muted-foreground">
                            {material.guest_count} pessoas
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={material.is_active}
                            onCheckedChange={() => handleToggleActive(material)}
                            className="scale-75"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(material)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteMaterial(material)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Summary */}
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {materials.filter(m => m.unit === selectedUnit && m.type === "pdf_package" && m.is_active).length} PDFs · {" "}
              {materials.filter(m => m.unit === selectedUnit && m.type === "photo" && m.is_active).length} fotos · {" "}
              {materials.filter(m => m.unit === selectedUnit && m.type === "video" && m.is_active).length} vídeos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para criar/editar material */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Editar Material" : "Novo Material"}
            </DialogTitle>
            <DialogDescription>
              {editingMaterial 
                ? "Edite as informações do material." 
                : `Adicione um novo material para ${selectedUnit}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Unit selector - always visible for editing */}
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select 
                value={editingMaterial ? formData.unit || selectedUnit : selectedUnit} 
                onValueChange={(value) => {
                  if (editingMaterial) {
                    setFormData({ ...formData, unit: value });
                  } else {
                    setSelectedUnit(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editingMaterial && (
              <div className="space-y-2">
                <Label>Tipo de Material *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: "pdf_package" | "photo" | "video") => 
                    setFormData({ ...formData, type: value, guest_count: null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf_package">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-red-500" />
                        PDF de Pacote
                      </div>
                    </SelectItem>
                    <SelectItem value="photo">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-blue-500" />
                        Foto do Salão
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-500" />
                        Vídeo do Salão
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === "pdf_package" && (
              <div className="space-y-2">
                <Label>Quantidade de Convidados *</Label>
                <Select 
                  value={formData.guest_count?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, guest_count: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GUEST_OPTIONS.map(count => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} pessoas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Material *</Label>
              <Input
                id="name"
                placeholder={
                  formData.type === "pdf_package" 
                    ? "Ex: Pacote Premium 50 pessoas" 
                    : formData.type === "photo" 
                      ? "Ex: Salão Principal"
                      : "Ex: Tour Virtual"
                }
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Arquivo *</Label>
              {formData.file_url ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  {getTypeIcon(formData.type)}
                  <span className="flex-1 truncate text-sm">
                    {formData.file_path?.split("/").pop() || "Arquivo selecionado"}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFormData({ ...formData, file_url: "", file_path: null })}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? "Enviando..." : "Clique para fazer upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.type === "pdf_package" && "Apenas PDF (máx. 50MB)"}
                    {formData.type === "photo" && "JPG, PNG ou WebP (máx. 50MB)"}
                    {formData.type === "video" && "MP4, MOV ou WebM (máx. 50MB)"}
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={
                  formData.type === "pdf_package" 
                    ? ".pdf" 
                    : formData.type === "photo" 
                      ? "image/jpeg,image/png,image/webp"
                      : "video/mp4,video/quicktime,video/webm"
                }
                onChange={handleFileUpload}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Material ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMaterial} disabled={isSaving || isUploading}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingMaterial ? "Salvar" : "Adicionar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
