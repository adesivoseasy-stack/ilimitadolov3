import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Image, Upload, Link, Code, Eye, Video } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string | null;
  code: string;
  image_url: string | null;
  video_url: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Templates() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('url');
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [category, setCategory] = useState("general");
  const [isActive, setIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as Template[];
    },
  });

  // Extract unique categories from templates
  const existingCategories = useMemo(() => {
    if (!templates) return ["general"];
    const cats = [...new Set(templates.map(t => t.category || "general"))];
    if (!cats.includes("general")) cats.unshift("general");
    return cats.sort();
  }, [templates]);

  const createMutation = useMutation({
    mutationFn: async (template: Omit<Template, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("templates")
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template criado com sucesso!");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...template }: Partial<Template> & { id: string }) => {
      const { data, error } = await supabase
        .from("templates")
        .update(template)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template atualizado com sucesso!");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar template: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir template: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setCode("");
    setImageUrl("");
    setVideoUrl("");
    setCategory("general");
    setIsActive(true);
    setEditingTemplate(null);
    setImageMode('url');
    setNewCategory("");
    setIsAddingCategory(false);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || "");
    setCode(template.code);
    setImageUrl(template.image_url || "");
    setVideoUrl(template.video_url || "");
    setCategory(template.category);
    setIsActive(template.is_active);
    setImageMode('url');
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Nome e código são obrigatórios");
      return;
    }

    const templateData = {
      name: name.trim(),
      description: description.trim() || null,
      code: code.trim(),
      image_url: imageUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      category: category.trim() || "general",
      is_active: isActive,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, ...templateData });
    } else {
      createMutation.mutate(templateData);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecione uma imagem");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('template-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('template-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const groupedTemplates = templates?.reduce((acc, template) => {
    const cat = template.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, Template[]>) || {};

  return (
    <AdminLayout>
      <div className="space-y-6 px-1 sm:px-0 pt-12 lg:pt-0">
        <div className="flex flex-col gap-3 sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-lg font-medium">Templates</h1>
            <p className="text-sm text-muted-foreground">Templates de código da extensão</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Editar Template" : "Novo Template"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Hero Section Moderno"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    {isAddingCategory ? (
                      <div className="flex gap-2">
                        <Input
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Nova categoria..."
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (newCategory.trim()) {
                              setCategory(newCategory.trim().toLowerCase());
                              setIsAddingCategory(false);
                              setNewCategory("");
                            }
                          }}
                        >
                          OK
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setNewCategory("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Select value={category} onValueChange={(val) => {
                        if (val === "__new__") {
                          setIsAddingCategory(true);
                        } else {
                          setCategory(val);
                        }
                      }}>
                        <SelectTrigger className="bg-card">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border z-50">
                          {existingCategories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="capitalize">
                              {cat}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new__" className="text-primary">
                            + Nova categoria
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve descrição do template"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Imagem de Preview</Label>
                  <div className="flex gap-2 mb-2">
                    <Button
                      type="button"
                      variant={imageMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImageMode('url')}
                    >
                      <Link className="h-4 w-4 mr-1" />
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant={imageMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImageMode('upload')}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  </div>
                  
                  {imageMode === 'url' ? (
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.png"
                    />
                  ) : (
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  )}
                  
                  {imageUrl && (
                    <div className="mt-2 relative">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="max-h-32 rounded border object-cover"
                        onError={() => toast.error("Erro ao carregar imagem")}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="videoUrl" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    URL do Vídeo (opcional)
                  </Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://exemplo.com/video.mp4 ou YouTube/Vimeo URL"
                  />
                  {videoUrl && (
                    <p className="text-xs text-muted-foreground">
                      Suporta URLs diretas de vídeo (.mp4, .webm) ou embed do YouTube/Vimeo
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Textarea
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Cole o código ou prompt do template aqui..."
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="is_active">Template ativo</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingTemplate ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando templates...</div>
        ) : Object.keys(groupedTemplates).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum template cadastrado. Clique em "Novo Template" para começar.
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-semibold capitalize flex items-center gap-2">
                <Badge variant="secondary">{category}</Badge>
                <span className="text-sm text-muted-foreground font-normal">
                  ({categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryTemplates.map((template) => (
                  <Card key={template.id} className={!template.is_active ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewCode(template.code)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O template "{template.name}" será permanentemente excluído.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(template.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {!template.is_active && (
                        <Badge variant="outline" className="w-fit">Inativo</Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      {template.video_url ? (
                        <div className="aspect-[4/3] bg-muted rounded-md overflow-hidden mb-3 relative">
                          {template.video_url.includes('youtube.com') || template.video_url.includes('youtu.be') ? (
                            <iframe
                              src={template.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : template.video_url.includes('vimeo.com') ? (
                            <iframe
                              src={template.video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                              className="w-full h-full"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              src={template.video_url}
                              className="w-full h-full object-cover"
                              controls
                              muted
                            />
                          )}
                          <Badge className="absolute top-2 right-2 bg-black/70">
                            <Video className="h-3 w-3 mr-1" />
                            Vídeo
                          </Badge>
                        </div>
                      ) : template.image_url ? (
                        <div className="aspect-[4/3] bg-muted rounded-md overflow-hidden mb-3">
                          <img
                            src={template.image_url}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-muted rounded-md flex items-center justify-center mb-3">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Code Preview Dialog */}
        <Dialog open={!!previewCode} onOpenChange={(open) => !open && setPreviewCode(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Preview do Código
              </DialogTitle>
            </DialogHeader>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[60vh] text-sm">
              <code>{previewCode}</code>
            </pre>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
