 import { useState } from "react";
 import { Helmet } from "react-helmet-async";
 import { motion } from "framer-motion";
 import { Link } from "react-router-dom";
 import { 
   MessageSquare, 
   BarChart3, 
   Zap, 
   Users, 
   Shield, 
   Smartphone,
   Clock,
   TrendingUp,
   CheckCircle2,
   ArrowRight,
   Star,
   PartyPopper,
   Heart,
   Send,
   Building2,
   Phone,
   Mail,
   MapPin
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import logoPlataforma from "@/assets/logo-plataforma-buffets.png";
 
 const features = [
   { icon: MessageSquare, title: "WhatsApp Integrado", desc: "Todas as conversas em um só lugar. Histórico completo, envio de mídia e templates." },
   { icon: BarChart3, title: "CRM Visual Kanban", desc: "Arraste e solte leads entre colunas. Visualize seu funil de vendas em tempo real." },
   { icon: Zap, title: "Landing Pages", desc: "Páginas de campanha profissionais com gatilhos de urgência e contagem regressiva." },
   { icon: Users, title: "Multi-usuário", desc: "Admin, comercial, visualização. Cada colaborador acessa só o que precisa." },
   { icon: Shield, title: "Bot de Qualificação", desc: "Capture nome, unidade, mês e convidados automaticamente. Lead já chega pronto." },
   { icon: Smartphone, title: "100% Responsivo", desc: "Funciona em desktop, tablet e celular. Atenda de qualquer lugar." },
   { icon: Clock, title: "Tempo Real", desc: "Notificações instantâneas. Nunca mais perca uma oportunidade." },
   { icon: TrendingUp, title: "Relatórios", desc: "Dashboard com KPIs: leads, conversões, tempo de resposta e muito mais." },
 ];
 
 const benefits = [
   "Centralize todas as conversas do WhatsApp",
   "Nunca mais perca leads por falta de follow-up",
   "Saiba exatamente quantos leads viraram contrato",
   "Crie campanhas profissionais em minutos",
   "Automatize a qualificação de leads",
   "Acesse de qualquer dispositivo",
 ];
 
 const testimonials = [
   { name: "Maria S.", company: "Buffet Alegria Kids", text: "Aumentamos 40% nas conversões depois que centralizamos o WhatsApp. Antes perdíamos muitos leads.", rating: 5 },
   { name: "João P.", company: "Festa Encantada", text: "O CRM Kanban é fantástico. Consigo ver todo meu funil de vendas de uma vez só.", rating: 5 },
   { name: "Ana C.", company: "Reino da Diversão", text: "A landing page de campanha é muito profissional. Os clientes amam o visual.", rating: 5 },
 ];
 
 export default function ParaBuffets() {
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [submitted, setSubmitted] = useState(false);
   const [formData, setFormData] = useState({
     company_name: "",
     contact_name: "",
     email: "",
     phone: "",
     city: "",
     state: "",
     monthly_parties: "",
     current_tools: "",
     main_challenges: "",
     how_found_us: "",
   });
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!formData.company_name || !formData.contact_name || !formData.email) {
       toast.error("Preencha os campos obrigatórios");
       return;
     }
 
     setIsSubmitting(true);
 
     try {
       const { error } = await supabase
         .from("b2b_leads")
         .insert({
           company_name: formData.company_name,
           contact_name: formData.contact_name,
           email: formData.email,
           phone: formData.phone || null,
           city: formData.city || null,
           state: formData.state || null,
           monthly_parties: formData.monthly_parties ? parseInt(formData.monthly_parties) : null,
           current_tools: formData.current_tools || null,
           main_challenges: formData.main_challenges || null,
           how_found_us: formData.how_found_us || null,
         });
 
       if (error) throw error;
 
       setSubmitted(true);
       toast.success("Solicitação enviada com sucesso!");
     } catch (error) {
       console.error("Error submitting B2B lead:", error);
       toast.error("Erro ao enviar. Tente novamente.");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-background">
       <Helmet>
         <title>Plataforma de Gestão para Buffets | CRM + WhatsApp + Landing Pages</title>
         <meta name="description" content="Plataforma completa de gestão comercial para buffets infantis. WhatsApp integrado, CRM visual Kanban e landing pages que convertem. Agende uma demonstração gratuita!" />
         <meta name="keywords" content="plataforma buffet, CRM buffet infantil, gestão buffet, WhatsApp business buffet, software buffet, sistema para buffet" />
         <meta name="robots" content="index, follow" />
         
         <link rel="canonical" href="https://castelodadiversao.online/para-buffets" />
         
         <meta property="og:type" content="website" />
         <meta property="og:url" content="https://castelodadiversao.online/para-buffets" />
         <meta property="og:title" content="Plataforma de Gestão para Buffets Infantis" />
         <meta property="og:description" content="Transforme visitantes em contratos fechados. WhatsApp integrado, CRM visual e landing pages profissionais. Feito por quem entende de buffet." />
         <meta property="og:image" content="https://castelodadiversao.online/og-para-buffets.jpg" />
         <meta property="og:image:width" content="1200" />
         <meta property="og:image:height" content="630" />
         <meta property="og:image:alt" content="Plataforma de Gestão para Buffets - Dashboard, CRM e WhatsApp integrado" />
         <meta property="og:locale" content="pt_BR" />
         <meta property="og:site_name" content="Castelo da Diversão" />
         
         <meta name="twitter:card" content="summary_large_image" />
         <meta name="twitter:url" content="https://castelodadiversao.online/para-buffets" />
         <meta name="twitter:title" content="Plataforma de Gestão para Buffets Infantis" />
         <meta name="twitter:description" content="Transforme visitantes em contratos fechados. WhatsApp integrado, CRM visual e landing pages profissionais." />
         <meta name="twitter:image" content="https://castelodadiversao.online/og-para-buffets.jpg" />
       </Helmet>
 
       {/* Header */}
       <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-16">
             <Link to="/" className="flex items-center gap-3">
             <img src={logoPlataforma} alt="Logo" className="h-10 w-10 object-contain" />
               <span className="font-display font-bold text-lg">Plataforma para Buffets</span>
             </Link>
             <a href="#form" className="hidden sm:inline-flex">
               <Button>Solicitar Demo</Button>
             </a>
           </div>
         </div>
       </header>
 
       {/* Hero */}
       <section className="relative py-20 lg:py-32 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
         <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
         <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
         
         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center max-w-4xl mx-auto">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6 }}
             >
               <Badge className="mb-6 text-sm px-4 py-2" variant="secondary">
                 🚀 Plataforma desenvolvida dentro de um buffet real
               </Badge>
               
               <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
                 Transforme visitantes em{" "}
                 <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                   contratos fechados
                 </span>
               </h1>
               
               <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                 A plataforma completa de gestão comercial para buffets infantis. 
                 WhatsApp integrado, CRM visual e landing pages que convertem.
               </p>
 
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <a href="#form">
                   <Button size="lg" className="text-lg px-8">
                     Quero uma Demonstração
                     <ArrowRight className="ml-2 h-5 w-5" />
                   </Button>
                 </a>
                 <a href="#features">
                   <Button size="lg" variant="outline" className="text-lg px-8">
                     Ver Funcionalidades
                   </Button>
                 </a>
               </div>
             </motion.div>
           </div>
         </div>
       </section>
 
       {/* Problem Section */}
       <section className="py-20 bg-muted/50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-center mb-12"
           >
             <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
               Você se identifica com isso?
             </h2>
           </motion.div>
 
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
             {[
               "Leads chegam pelo WhatsApp e se perdem na bagunça",
               "Cada vendedor usa o próprio celular",
               "Não sabe quantos leads viraram contrato",
               "Promoções divulgadas de forma amadora",
               "Zero visibilidade de métricas",
               "Clientes não recebem follow-up",
             ].map((problem, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
                 className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20"
               >
                 <span className="text-destructive font-bold text-lg">✗</span>
                 <span className="text-foreground">{problem}</span>
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* Features */}
       <section id="features" className="py-20">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-center mb-16"
           >
             <Badge className="mb-4" variant="outline">Funcionalidades</Badge>
             <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
               Tudo que você precisa em um só lugar
             </h2>
             <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
               Desenvolvido por quem entende as dores de um buffet
             </p>
           </motion.div>
 
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
             {features.map((feature, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
               >
                 <Card className="h-full hover:border-primary/30 transition-colors">
                   <CardHeader>
                     <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                       <feature.icon className="h-6 w-6 text-primary" />
                     </div>
                     <CardTitle className="text-lg">{feature.title}</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <p className="text-sm text-muted-foreground">{feature.desc}</p>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* Benefits */}
       <section className="py-20 bg-primary text-primary-foreground">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid lg:grid-cols-2 gap-12 items-center">
             <motion.div
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
             >
               <h2 className="text-3xl md:text-4xl font-display font-bold mb-8">
                 Por que escolher nossa plataforma?
               </h2>
               <ul className="space-y-4">
                 {benefits.map((benefit, index) => (
                   <li key={index} className="flex items-center gap-3">
                     <CheckCircle2 className="h-6 w-6 text-secondary shrink-0" />
                     <span className="text-lg">{benefit}</span>
                   </li>
                 ))}
               </ul>
             </motion.div>
 
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="bg-white/10 backdrop-blur-lg rounded-3xl p-8"
             >
               <h3 className="text-2xl font-bold mb-6">Prova Social</h3>
               <div className="grid grid-cols-3 gap-6 text-center">
                 <div>
                   <div className="flex items-center justify-center gap-1 mb-2">
                     <Star className="h-6 w-6 fill-secondary text-secondary" />
                     <span className="text-3xl font-bold">4.9</span>
                   </div>
                   <p className="text-sm opacity-80">no Google</p>
                 </div>
                 <div>
                   <div className="flex items-center justify-center gap-1 mb-2">
                     <PartyPopper className="h-6 w-6" />
                     <span className="text-3xl font-bold">5k+</span>
                   </div>
                   <p className="text-sm opacity-80">festas</p>
                 </div>
                 <div>
                   <div className="flex items-center justify-center gap-1 mb-2">
                     <Heart className="h-6 w-6 fill-secondary text-secondary" />
                     <span className="text-3xl font-bold">98%</span>
                   </div>
                   <p className="text-sm opacity-80">satisfação</p>
                 </div>
               </div>
             </motion.div>
           </div>
         </div>
       </section>
 
       {/* Testimonials */}
       <section className="py-20">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-center mb-12"
           >
             <Badge className="mb-4" variant="outline">Depoimentos</Badge>
             <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
               O que nossos clientes dizem
             </h2>
           </motion.div>
 
           <div className="grid md:grid-cols-3 gap-6">
             {testimonials.map((testimonial, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: index * 0.1 }}
               >
                 <Card className="h-full">
                   <CardContent className="pt-6">
                     <div className="flex gap-1 mb-4">
                       {[...Array(testimonial.rating)].map((_, i) => (
                         <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
                       ))}
                     </div>
                     <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                     <div>
                       <p className="font-semibold">{testimonial.name}</p>
                       <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                     </div>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </div>
         </div>
       </section>
 
       {/* Form Section */}
       <section id="form" className="py-20 bg-muted/50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid lg:grid-cols-2 gap-12">
             <motion.div
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
             >
               <Badge className="mb-4">Demonstração Gratuita</Badge>
               <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                 Quer ver a plataforma funcionando?
               </h2>
               <p className="text-lg text-muted-foreground mb-8">
                 Preencha o formulário e nossa equipe entrará em contato para agendar 
                 uma demonstração gratuita de 15 minutos. Sem compromisso.
               </p>
 
               <div className="space-y-4">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                     <Clock className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-semibold">Demo de 15 minutos</p>
                     <p className="text-sm text-muted-foreground">Direto ao ponto, sem enrolação</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                     <Shield className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-semibold">Sem compromisso</p>
                     <p className="text-sm text-muted-foreground">Você decide se faz sentido</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                     <Users className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-semibold">Equipe especializada</p>
                     <p className="text-sm text-muted-foreground">Quem atende entende de buffet</p>
                   </div>
                 </div>
               </div>
             </motion.div>
 
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
             >
               <Card className="shadow-xl">
                 <CardHeader>
                   <CardTitle>Solicite sua Demonstração</CardTitle>
                   <CardDescription>
                     Campos com * são obrigatórios
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   {submitted ? (
                     <div className="text-center py-8">
                       <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                         <CheckCircle2 className="h-8 w-8 text-accent" />
                       </div>
                       <h3 className="text-xl font-bold mb-2">Solicitação Enviada!</h3>
                       <p className="text-muted-foreground">
                         Nossa equipe entrará em contato em até 24 horas úteis.
                       </p>
                     </div>
                   ) : (
                     <form onSubmit={handleSubmit} className="space-y-4">
                       <div className="grid sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <Label htmlFor="company_name">Nome do Buffet *</Label>
                           <div className="relative">
                             <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                             <Input
                               id="company_name"
                               placeholder="Buffet Alegria"
                               className="pl-10"
                               value={formData.company_name}
                               onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                               required
                             />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label htmlFor="contact_name">Seu Nome *</Label>
                           <Input
                             id="contact_name"
                             placeholder="João Silva"
                             value={formData.contact_name}
                             onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                             required
                           />
                         </div>
                       </div>
 
                       <div className="grid sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <Label htmlFor="email">Email *</Label>
                           <div className="relative">
                             <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                             <Input
                               id="email"
                               type="email"
                               placeholder="joao@buffet.com"
                               className="pl-10"
                               value={formData.email}
                               onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                               required
                             />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label htmlFor="phone">WhatsApp</Label>
                           <div className="relative">
                             <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                             <Input
                               id="phone"
                               placeholder="(11) 99999-9999"
                               className="pl-10"
                               value={formData.phone}
                               onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                             />
                           </div>
                         </div>
                       </div>
 
                       <div className="grid sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <Label htmlFor="city">Cidade</Label>
                           <div className="relative">
                             <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                             <Input
                               id="city"
                               placeholder="São Paulo"
                               className="pl-10"
                               value={formData.city}
                               onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                             />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label htmlFor="state">Estado</Label>
                           <Select
                             value={formData.state}
                             onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione" />
                             </SelectTrigger>
                             <SelectContent>
                               {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                                 <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                       </div>
 
                       <div className="grid sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <Label htmlFor="monthly_parties">Festas por mês</Label>
                           <Select
                             value={formData.monthly_parties}
                             onValueChange={(value) => setFormData(prev => ({ ...prev, monthly_parties: value }))}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="5">Até 5</SelectItem>
                               <SelectItem value="10">6 a 10</SelectItem>
                               <SelectItem value="20">11 a 20</SelectItem>
                               <SelectItem value="30">21 a 30</SelectItem>
                               <SelectItem value="50">Mais de 30</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         <div className="space-y-2">
                           <Label htmlFor="how_found_us">Como nos encontrou?</Label>
                           <Select
                             value={formData.how_found_us}
                             onValueChange={(value) => setFormData(prev => ({ ...prev, how_found_us: value }))}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="google">Google</SelectItem>
                               <SelectItem value="instagram">Instagram</SelectItem>
                               <SelectItem value="indicacao">Indicação</SelectItem>
                               <SelectItem value="evento">Evento do setor</SelectItem>
                               <SelectItem value="outro">Outro</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>
 
                       <div className="space-y-2">
                         <Label htmlFor="main_challenges">Qual seu maior desafio hoje?</Label>
                         <Textarea
                           id="main_challenges"
                           placeholder="Ex: Perco muitos leads por falta de follow-up..."
                           rows={3}
                           value={formData.main_challenges}
                           onChange={(e) => setFormData(prev => ({ ...prev, main_challenges: e.target.value }))}
                         />
                       </div>
 
                       <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                         {isSubmitting ? (
                           <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                             Enviando...
                           </>
                         ) : (
                           <>
                             <Send className="h-4 w-4 mr-2" />
                             Solicitar Demonstração
                           </>
                         )}
                       </Button>
                     </form>
                   )}
                 </CardContent>
               </Card>
             </motion.div>
           </div>
         </div>
       </section>
 
       {/* Footer */}
       <footer className="py-12 bg-foreground text-background">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-3">
             <img src={logoPlataforma} alt="Logo" className="h-10 w-10 object-contain" />
               <span className="font-display font-bold">Plataforma para Buffets</span>
             </div>
             <p className="text-sm opacity-70">
               © {new Date().getFullYear()} Todos os direitos reservados.
             </p>
             <Link to="/" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
               Voltar ao site principal
             </Link>
           </div>
         </div>
       </footer>
     </div>
   );
 }