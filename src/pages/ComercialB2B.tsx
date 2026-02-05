 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { SidebarProvider } from "@/components/ui/sidebar";
 import { AdminSidebar } from "@/components/admin/AdminSidebar";
 import { supabase } from "@/integrations/supabase/client";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { 
   Presentation, 
   DollarSign, 
   CheckCircle2, 
   Target, 
   MessageSquare,
   BarChart3,
   Users,
   Zap,
   Shield,
   Smartphone,
   Clock,
   TrendingUp,
   FileText,
   Copy,
   Check
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { toast } from "sonner";
 
 const ComercialB2B = () => {
   const navigate = useNavigate();
   const [currentUserName, setCurrentUserName] = useState("");
   const [role, setRole] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [copiedText, setCopiedText] = useState<string | null>(null);
 
   useEffect(() => {
     const checkAuth = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         navigate("/auth");
         return;
       }
       
       // Fetch profile and role in parallel
       const [profileResult, roleResult] = await Promise.all([
         supabase
           .from("profiles")
           .select("full_name")
           .eq("user_id", session.user.id)
           .single(),
         supabase
           .from("user_roles")
           .select("role")
           .eq("user_id", session.user.id)
           .maybeSingle()
       ]);
       
       if (profileResult.data) {
         setCurrentUserName(profileResult.data.full_name);
       }
       
       if (roleResult.data) {
         setRole(roleResult.data.role);
       }
       
       setIsLoading(false);
     };
     
     checkAuth();
   }, [navigate]);
 
   const handleLogout = async () => {
     await supabase.auth.signOut();
     navigate("/auth");
   };
 
   const handleRefresh = () => {
     window.location.reload();
   };
 
   const copyToClipboard = (text: string, label: string) => {
     navigator.clipboard.writeText(text);
     setCopiedText(label);
     toast.success("Copiado para a área de transferência!");
     setTimeout(() => setCopiedText(null), 2000);
   };
 
   const canManageUsers = role === "admin";
 
   if (isLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
       </div>
     );
   }
 
   const pitchText = `🎯 Transforme visitantes em contratos fechados — sem perder nenhum lead no WhatsApp.
 
 Sua equipe comercial perde leads no WhatsApp? Cada vendedor usa o próprio celular? Você não sabe quantos orçamentos viraram contratos?
 
 Nossa plataforma resolve isso:
 ✅ Central de WhatsApp unificada
 ✅ CRM visual com Kanban
 ✅ Landing pages de campanha prontas
 ✅ Bot de qualificação automática
 ✅ Notificações em tempo real
 ✅ Relatórios e métricas
 
 Feito especialmente para buffets infantis. Agende uma demonstração!`;
 
   return (
     <SidebarProvider defaultOpen={false}>
       <div className="min-h-screen flex w-full bg-background">
         <AdminSidebar
           canManageUsers={canManageUsers}
           currentUserName={currentUserName}
           onRefresh={handleRefresh}
           onLogout={handleLogout}
         />
         
         <main className="flex-1 overflow-auto">
           <div className="p-6 max-w-6xl mx-auto">
             {/* Header */}
             <div className="mb-8">
               <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60">
                   <Presentation className="h-6 w-6 text-primary-foreground" />
                 </div>
                 <h1 className="text-3xl font-display font-bold text-foreground">
                   Comercial B2B
                 </h1>
               </div>
               <p className="text-muted-foreground">
                 Materiais e informações para vender a plataforma para outros buffets
               </p>
             </div>
 
             {/* Tabs */}
             <Tabs defaultValue="pitch" className="space-y-6">
               <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                 <TabsTrigger value="pitch" className="flex items-center gap-2 py-3">
                   <Target className="h-4 w-4" />
                   <span className="hidden sm:inline">Pitch de Vendas</span>
                   <span className="sm:hidden">Pitch</span>
                 </TabsTrigger>
                 <TabsTrigger value="features" className="flex items-center gap-2 py-3">
                   <Zap className="h-4 w-4" />
                   <span className="hidden sm:inline">Funcionalidades</span>
                   <span className="sm:hidden">Features</span>
                 </TabsTrigger>
                 <TabsTrigger value="pricing" className="flex items-center gap-2 py-3">
                   <DollarSign className="h-4 w-4" />
                   <span className="hidden sm:inline">Precificação</span>
                   <span className="sm:hidden">Preços</span>
                 </TabsTrigger>
                 <TabsTrigger value="objections" className="flex items-center gap-2 py-3">
                   <MessageSquare className="h-4 w-4" />
                   <span className="hidden sm:inline">Objeções</span>
                   <span className="sm:hidden">FAQ</span>
                 </TabsTrigger>
               </TabsList>
 
               {/* Pitch Tab */}
               <TabsContent value="pitch" className="space-y-6">
                 {/* Headline */}
                 <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                   <CardHeader>
                     <CardTitle className="text-2xl">🎯 Headline Principal</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <blockquote className="text-xl md:text-2xl font-bold text-foreground border-l-4 border-primary pl-4">
                       "Transforme visitantes em contratos fechados — sem perder nenhum lead no WhatsApp."
                     </blockquote>
                   </CardContent>
                 </Card>
 
                 {/* Problem */}
                 <Card>
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                       <Target className="h-5 w-5 text-destructive" />
                       O Problema (Dor do Cliente)
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <ul className="space-y-3">
                       {[
                         "Leads chegam pelo WhatsApp e se perdem na bagunça de mensagens",
                         "Não sabe quais clientes estão quentes ou frios",
                         "Equipe comercial sem controle — cada um usa o próprio celular",
                         "Promoções divulgadas de forma amadora, sem landing page profissional",
                         "Zero visibilidade de métricas: quantos leads chegaram? Quantos fecharam?",
                       ].map((item, index) => (
                         <li key={index} className="flex items-start gap-3">
                           <span className="text-destructive font-bold">✗</span>
                           <span className="text-muted-foreground">{item}</span>
                         </li>
                       ))}
                     </ul>
                   </CardContent>
                 </Card>
 
                 {/* Solution */}
                 <Card>
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                       <CheckCircle2 className="h-5 w-5 text-accent" />
                       A Solução (Nossa Plataforma)
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="grid md:grid-cols-2 gap-4">
                       {[
                         { icon: "🎪", title: "Landing Pages de Campanha", desc: "Páginas profissionais prontas em minutos. Troque a promoção, os textos e pronto — nova campanha no ar." },
                         { icon: "💬", title: "Central de WhatsApp", desc: "Todas as conversas em um só lugar. Sua equipe responde do computador, com histórico completo." },
                         { icon: "🤖", title: "Bot de Qualificação", desc: "Captura nome, unidade, mês e número de convidados automaticamente — lead já chega qualificado." },
                         { icon: "📊", title: "CRM Kanban", desc: "Visualize cada lead em colunas: Novo → Em Contato → Orçamento → Fechado. Arraste e solte." },
                         { icon: "👥", title: "Multi-usuário", desc: "Admin, comercial, visualização. Cada um vê só o que precisa." },
                         { icon: "🔔", title: "Notificações em Tempo Real", desc: "Novo lead? Você é avisado na hora. Nunca mais perca oportunidade." },
                       ].map((item, index) => (
                         <div key={index} className="flex gap-3 p-4 rounded-lg bg-muted/50">
                           <span className="text-2xl">{item.icon}</span>
                           <div>
                             <h4 className="font-semibold text-foreground">{item.title}</h4>
                             <p className="text-sm text-muted-foreground">{item.desc}</p>
                           </div>
                         </div>
                       ))}
                     </div>
                   </CardContent>
                 </Card>
 
                 {/* Copy Pitch */}
                 <Card>
                   <CardHeader>
                     <div className="flex items-center justify-between">
                       <CardTitle className="flex items-center gap-2">
                         <FileText className="h-5 w-5" />
                         Texto para Copiar
                       </CardTitle>
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={() => copyToClipboard(pitchText, "pitch")}
                       >
                         {copiedText === "pitch" ? (
                           <Check className="h-4 w-4 mr-2" />
                         ) : (
                           <Copy className="h-4 w-4 mr-2" />
                         )}
                         Copiar
                       </Button>
                     </div>
                   </CardHeader>
                   <CardContent>
                     <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                       {pitchText}
                     </pre>
                   </CardContent>
                 </Card>
               </TabsContent>
 
               {/* Features Tab */}
               <TabsContent value="features" className="space-y-6">
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {[
                     { icon: MessageSquare, title: "WhatsApp Integrado", desc: "Envie texto, áudio, imagem, vídeo e documentos direto da plataforma", badge: "Core" },
                     { icon: BarChart3, title: "CRM Visual", desc: "Kanban drag-and-drop para gestão de leads com status personalizados", badge: "Core" },
                     { icon: Zap, title: "Landing Pages", desc: "Páginas de campanha profissionais com gatilhos de urgência", badge: "Core" },
                     { icon: Users, title: "Multi-usuário", desc: "Controle de acesso por função: admin, comercial, visualização", badge: "Core" },
                     { icon: Shield, title: "Bot de Qualificação", desc: "Coleta dados automaticamente: nome, unidade, mês, convidados", badge: "Automação" },
                     { icon: Smartphone, title: "100% Responsivo", desc: "Funciona perfeitamente em desktop, tablet e celular", badge: "UX" },
                     { icon: Clock, title: "Tempo Real", desc: "Notificações instantâneas de novos leads e mensagens", badge: "Core" },
                     { icon: TrendingUp, title: "Métricas", desc: "Dashboard com KPIs: leads, conversões, tempo de resposta", badge: "Analytics" },
                     { icon: FileText, title: "Exportação", desc: "Exporte leads para CSV a qualquer momento", badge: "Utilitário" },
                   ].map((feature, index) => (
                     <Card key={index} className="hover:border-primary/30 transition-colors">
                       <CardHeader className="pb-2">
                         <div className="flex items-start justify-between">
                           <div className="p-2 rounded-lg bg-primary/10">
                             <feature.icon className="h-5 w-5 text-primary" />
                           </div>
                           <Badge variant="secondary" className="text-xs">
                             {feature.badge}
                           </Badge>
                         </div>
                         <CardTitle className="text-lg">{feature.title}</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <p className="text-sm text-muted-foreground">{feature.desc}</p>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
 
                 {/* Differentiators */}
                 <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent">
                   <CardHeader>
                     <CardTitle>🏆 Diferenciais Competitivos</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="grid md:grid-cols-2 gap-4">
                       {[
                         { title: "Feito para Buffets", desc: "Não é um CRM genérico. Campos como 'unidade', 'mês da festa', 'dia da semana' já vêm prontos." },
                         { title: "WhatsApp Nativo", desc: "Integração real com WhatsApp Business — não é apenas um redirecionador de links." },
                         { title: "Landing Pages que Convertem", desc: "Design profissional, responsivo, com gatilhos de urgência e contagem regressiva." },
                         { title: "Sem Instalação", desc: "100% na nuvem. Acesse de qualquer dispositivo, a qualquer hora." },
                       ].map((item, index) => (
                         <div key={index} className="flex items-start gap-3">
                           <CheckCircle2 className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                           <div>
                             <h4 className="font-semibold text-foreground">{item.title}</h4>
                             <p className="text-sm text-muted-foreground">{item.desc}</p>
                           </div>
                         </div>
                       ))}
                     </div>
                   </CardContent>
                 </Card>
               </TabsContent>
 
               {/* Pricing Tab */}
               <TabsContent value="pricing" className="space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle>💰 Modelo de Precificação Sugerido</CardTitle>
                     <CardDescription>
                       Valores sugestivos para comercialização da plataforma
                     </CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="grid md:grid-cols-3 gap-6">
                       {/* Starter */}
                       <Card className="border-2">
                         <CardHeader className="text-center pb-2">
                           <Badge variant="outline" className="w-fit mx-auto mb-2">Starter</Badge>
                           <CardTitle className="text-3xl">R$ 197</CardTitle>
                           <CardDescription>/mês</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-3">
                           {[
                             "1 unidade",
                             "2 usuários",
                             "500 leads/mês",
                             "WhatsApp integrado",
                             "CRM básico",
                             "Landing page padrão",
                           ].map((item, index) => (
                             <div key={index} className="flex items-center gap-2 text-sm">
                               <CheckCircle2 className="h-4 w-4 text-accent" />
                               <span>{item}</span>
                             </div>
                           ))}
                         </CardContent>
                       </Card>
 
                       {/* Pro */}
                       <Card className="border-2 border-primary relative">
                         <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                           <Badge className="bg-primary">Mais Popular</Badge>
                         </div>
                         <CardHeader className="text-center pb-2">
                           <Badge variant="outline" className="w-fit mx-auto mb-2">Pro</Badge>
                           <CardTitle className="text-3xl">R$ 497</CardTitle>
                           <CardDescription>/mês</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-3">
                           {[
                             "3 unidades",
                             "5 usuários",
                             "Leads ilimitados",
                             "WhatsApp + Bot",
                             "CRM completo",
                             "Landing pages customizadas",
                             "Relatórios avançados",
                             "Suporte prioritário",
                           ].map((item, index) => (
                             <div key={index} className="flex items-center gap-2 text-sm">
                               <CheckCircle2 className="h-4 w-4 text-primary" />
                               <span>{item}</span>
                             </div>
                           ))}
                         </CardContent>
                       </Card>
 
                       {/* Enterprise */}
                       <Card className="border-2">
                         <CardHeader className="text-center pb-2">
                           <Badge variant="outline" className="w-fit mx-auto mb-2">Enterprise</Badge>
                           <CardTitle className="text-2xl">Sob Consulta</CardTitle>
                           <CardDescription>personalizado</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-3">
                           {[
                             "Unidades ilimitadas",
                             "Usuários ilimitados",
                             "White-label",
                             "API de integração",
                             "Suporte dedicado",
                             "SLA garantido",
                             "Treinamento incluso",
                             "Customizações",
                           ].map((item, index) => (
                             <div key={index} className="flex items-center gap-2 text-sm">
                               <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                               <span>{item}</span>
                             </div>
                           ))}
                         </CardContent>
                       </Card>
                     </div>
                   </CardContent>
                 </Card>
 
                 {/* ROI Calculator */}
                 <Card>
                   <CardHeader>
                     <CardTitle>📊 Argumento de ROI</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="bg-muted p-4 rounded-lg space-y-3">
                       <p className="text-sm text-muted-foreground">
                         <strong className="text-foreground">Cenário:</strong> Buffet fecha em média 10 festas/mês a R$ 3.000 cada = R$ 30.000/mês
                       </p>
                       <p className="text-sm text-muted-foreground">
                         <strong className="text-foreground">Problema:</strong> Perdem ~20% dos leads por falta de follow-up = R$ 6.000 perdidos
                       </p>
                       <p className="text-sm text-muted-foreground">
                         <strong className="text-foreground">Com a plataforma:</strong> Recuperam metade = +R$ 3.000/mês
                       </p>
                       <div className="pt-2 border-t border-border">
                         <p className="font-bold text-foreground">
                           ROI: Investimento de R$ 497 → Retorno de R$ 3.000 = <span className="text-accent">6x de retorno</span>
                         </p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </TabsContent>
 
               {/* Objections Tab */}
               <TabsContent value="objections" className="space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle>🛡️ Quebrando Objeções</CardTitle>
                     <CardDescription>
                       Respostas prontas para as objeções mais comuns
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-6">
                     {[
                       {
                         objection: "\"Já uso WhatsApp no celular, funciona bem\"",
                         response: "Funciona até você ter 3 vendedores e não saber quem respondeu quem. Com nossa plataforma, todo histórico fica centralizado, você vê quem atendeu cada lead e nunca perde uma oportunidade."
                       },
                       {
                         objection: "\"É caro demais\"",
                         response: "Uma festa perdida por falta de follow-up custa quanto? R$ 3.000? R$ 5.000? A plataforma custa menos que UMA festa não fechada por mês. E você recupera várias."
                       },
                       {
                         objection: "\"Minha equipe não vai usar\"",
                         response: "É mais fácil que WhatsApp! Interface limpa, tudo no navegador. Oferecemos treinamento incluso e suporte para garantir a adoção."
                       },
                       {
                         objection: "\"Preciso ver funcionando primeiro\"",
                         response: "Perfeito! Oferecemos demonstração gratuita de 15 minutos. Você vê o sistema real, com dados de exemplo, e pode fazer perguntas ao vivo."
                       },
                       {
                         objection: "\"E se eu quiser cancelar?\"",
                         response: "Sem fidelidade. Cancele quando quiser. Seus dados podem ser exportados a qualquer momento. Zero risco."
                       },
                       {
                         objection: "\"Vocês têm experiência com buffets?\"",
                         response: "A plataforma foi desenvolvida dentro de um buffet real (Castelo da Diversão) com +5.000 festas realizadas. Conhecemos as dores porque vivemos elas."
                       },
                     ].map((item, index) => (
                       <div key={index} className="space-y-2">
                         <h4 className="font-semibold text-destructive">{item.objection}</h4>
                         <p className="text-muted-foreground pl-4 border-l-2 border-accent">
                           {item.response}
                         </p>
                       </div>
                     ))}
                   </CardContent>
                 </Card>
 
                 {/* Social Proof */}
                 <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
                   <CardHeader>
                     <CardTitle>⭐ Prova Social</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="grid md:grid-cols-3 gap-4 text-center">
                       <div className="p-4">
                         <p className="text-3xl font-bold text-foreground">4.9/5</p>
                         <p className="text-sm text-muted-foreground">Avaliação no Google</p>
                       </div>
                       <div className="p-4">
                         <p className="text-3xl font-bold text-foreground">+5.000</p>
                         <p className="text-sm text-muted-foreground">Festas realizadas</p>
                       </div>
                       <div className="p-4">
                         <p className="text-3xl font-bold text-foreground">98%</p>
                         <p className="text-sm text-muted-foreground">Taxa de satisfação</p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
 
                 {/* CTA */}
                 <Card className="bg-primary text-primary-foreground">
                   <CardContent className="py-8 text-center">
                     <h3 className="text-2xl font-bold mb-2">📞 Call-to-Action Sugerido</h3>
                     <blockquote className="text-lg opacity-90">
                       "Agende uma demonstração gratuita de 15 minutos. Veja como automatizar seu comercial e nunca mais perder um lead."
                     </blockquote>
                   </CardContent>
                 </Card>
               </TabsContent>
             </Tabs>
           </div>
         </main>
       </div>
     </SidebarProvider>
   );
 };
 
 export default ComercialB2B;