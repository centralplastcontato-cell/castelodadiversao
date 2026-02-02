// =========================================
// CONFIGURAÇÃO DA CAMPANHA ATUAL
// Edite este arquivo para atualizar a promoção
// =========================================

export const campaignConfig = {
  // HERO
  title: "Esquenta de Carnaval",
  subtitle: "Castelo da Diversão",
  tagline: "🎭 Festeje o Carnaval com a gente!",
  
  // OFERTA PRINCIPAL
  offer: {
    headline: "Pacote Carnaval Especial",
    description: "Festas de segunda a quinta-feira no mês de fevereiro com condições imperdíveis!",
    benefits: [
      "20% de desconto no pacote completo",
      "10 convidados extras grátis",
      "Decoração temática de Carnaval inclusa",
      "Mesa de doces personalizada",
    ],
    originalPrice: "R$ 4.500",
    promoPrice: "R$ 3.600",
    validUntil: "15 de Fevereiro de 2026",
    conditions: [
      "Válido para festas realizadas em fevereiro/2026",
      "Segunda a quinta-feira",
      "Sujeito à disponibilidade de datas",
      "Não cumulativo com outras promoções",
    ],
  },

  // URGÊNCIA
  urgency: {
    message: "⏰ Últimas vagas para fevereiro!",
    spotsLeft: 8,
    deadline: "Promoção válida até 15/02",
  },

  // CHATBOT - Opções configuráveis
  chatbot: {
    monthOptions: ["Fevereiro", "Março", "Abril"],
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
    title: "+15 Anos de Experiência",
    description: "Milhares de festas realizadas com excelência e alegria",
  },
];
