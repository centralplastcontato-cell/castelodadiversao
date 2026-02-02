// =========================================
// CONFIGURAÇÃO DA CAMPANHA ATUAL
// Edite este arquivo para atualizar a promoção
// =========================================

export const campaignConfig = {
  // HERO
  title: "Esquenta de Carnaval",
  subtitle: "Sua festa com vantagem de verdade!",
  tagline: "🎭 O Carnaval chegou mais cedo!",
  
  // OFERTA PRINCIPAL
  offer: {
    headline: "Oferta Especial por Tempo Limitado",
    description: "Vai fazer festa em fevereiro ou março de 2026? Então essa oferta é pra você!",
    benefits: [
      "10% de desconto à vista",
      "10 convidados grátis no seu pacote",
      "Válida para pacotes Castelo, Super e Premium",
      "Festas realizadas em Fevereiro e Março de 2026",
    ],
    validUntil: "14 de Fevereiro de 2026",
    conditions: [
      "Válida para os 10 primeiros contratos fechados ou até 14/02",
      "Pacotes elegíveis: Castelo, Super e Premium",
      "Festas realizadas em Fevereiro e Março de 2026",
      "Promoção não cumulativa com outras ofertas",
    ],
  },

  // URGÊNCIA
  urgency: {
    message: "⏰ Vagas limitadas! Corra antes que acabe!",
    spotsLeft: 10,
    deadline: "Válida para os 10 primeiros contratos ou até 14/02",
  },

  // CHATBOT - Opções configuráveis
  chatbot: {
    monthOptions: ["Fevereiro", "Março"],
    dayOptions: ["Segunda a Quinta", "Sexta", "Sábado", "Domingo"],
    guestOptions: ["Até 50 pessoas", "51-70 pessoas", "71-100 pessoas", "100+ pessoas"],
  },

  // IDENTIFICAÇÃO
  campaignId: "carnaval-2026",
  campaignName: "Esquenta de Carnaval 2026",
};

// BENEFÍCIOS DO CASTELO (fixos)
export const castleBenefits = [
  {
    icon: "🏰",
    title: "Estrutura Completa",
    description: "Espaço amplo e climatizado com capacidade para até 150 convidados",
  },
  {
    icon: "🎪",
    title: "Brinquedos Incríveis",
    description: "Pula-pula, piscina de bolinhas, playground e muito mais diversão",
  },
  {
    icon: "👨‍🍳",
    title: "Buffet Completo",
    description: "Cardápio delicioso para crianças e adultos com opções variadas",
  },
  {
    icon: "🎭",
    title: "Monitores Profissionais",
    description: "Equipe treinada para cuidar da diversão e segurança das crianças",
  },
  {
    icon: "📸",
    title: "Espaço Instagramável",
    description: "Cenários decorados perfeitos para fotos memoráveis",
  },
  {
    icon: "🎉",
    title: "+10 Anos na Cidade",
    description: "Milhares de festas realizadas com excelência e alegria",
  },
];
