import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { campaignConfig } from "@/config/campaignConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
  options?: string[];
  isInput?: boolean;
}

interface LeadData {
  month?: string;
  day?: string;
  guests?: string;
  name?: string;
  whatsapp?: string;
}

interface LeadChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeadChatbot({ isOpen, onClose }: LeadChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState<LeadData>({});
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState<"name" | "whatsapp" | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            type: "bot",
            content: "Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento com a promoção 😉",
          },
        ]);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: "month",
              type: "bot",
              content: "Para qual mês você pretende realizar a festa?",
              options: campaignConfig.chatbot.monthOptions,
            },
          ]);
        }, 800);
      }, 500);
    }
  }, [isOpen, messages.length]);

  const handleOptionSelect = (option: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: option,
    };
    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      switch (currentStep) {
        case 0:
          setLeadData((prev) => ({ ...prev, month: option }));
          setMessages((prev) => [
            ...prev,
            {
              id: "day",
              type: "bot",
              content: "Perfeito! Em qual dia da semana você prefere?",
              options: campaignConfig.chatbot.dayOptions,
            },
          ]);
          setCurrentStep(1);
          break;
        case 1:
          setLeadData((prev) => ({ ...prev, day: option }));
          setMessages((prev) => [
            ...prev,
            {
              id: "guests",
              type: "bot",
              content: "Para quantas pessoas será a festa?",
              options: campaignConfig.chatbot.guestOptions,
            },
          ]);
          setCurrentStep(2);
          break;
        case 2:
          setLeadData((prev) => ({ ...prev, guests: option }));
          setMessages((prev) => [
            ...prev,
            {
              id: "capture",
              type: "bot",
              content: "Perfeito! 🎉\n\nAgora precisamos dos seus dados para te enviar o orçamento certinho 👇",
              isInput: true,
            },
          ]);
          setCurrentStep(3);
          setInputType("name");
          break;
      }
    }, 500);
  };

  const handleInputSubmit = async () => {
    if (!inputValue.trim() || isSaving) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);

    if (inputType === "name") {
      setLeadData((prev) => ({ ...prev, name: inputValue }));
      setInputValue("");
      setInputType("whatsapp");
    } else if (inputType === "whatsapp") {
      const whatsappValue = inputValue;
      setInputValue("");
      setInputType(null);
      setIsSaving(true);

      try {
        // Salvar lead no banco de dados
        const { error } = await supabase.from("campaign_leads").insert({
          name: leadData.name,
          whatsapp: whatsappValue,
          month: leadData.month,
          day_preference: leadData.day,
          guests: leadData.guests,
          campaign_id: campaignConfig.campaignId,
          campaign_name: campaignConfig.campaignName,
        });

        if (error) throw error;

        setMessages((prev) => [
          ...prev,
          {
            id: "complete",
            type: "bot",
            content: `Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nPromoção válida conforme regras da campanha: ${campaignConfig.campaignName}`,
          },
        ]);
        setIsComplete(true);
      } catch (error) {
        console.error("Erro ao salvar lead:", error);
        toast({
          title: "Erro ao enviar",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        setInputType("whatsapp");
        setInputValue(whatsappValue);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentStep(0);
    setLeadData({});
    setInputValue("");
    setInputType(null);
    setIsComplete(false);
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card rounded-3xl shadow-floating w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-hero p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-bold text-primary-foreground">Castelo da Diversão</h3>
                <p className="text-sm text-primary-foreground/80">Online agora</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
            >
              <X className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                    {message.options && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => handleOptionSelect(option)}
                            className="bg-card text-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {inputType && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-t border-border"
            >
              <p className="text-sm text-muted-foreground mb-2">
                {inputType === "name" ? "Digite seu nome:" : "Digite seu WhatsApp:"}
              </p>
              <div className="flex gap-2">
                <input
                  type={inputType === "whatsapp" ? "tel" : "text"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleInputSubmit()}
                  placeholder={inputType === "name" ? "Seu nome completo" : "(11) 99999-9999"}
                  className="flex-1 bg-muted border border-border rounded-full px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleInputSubmit}
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground p-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          )}

          {/* Complete State */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-t border-border"
            >
              <button
                onClick={resetChat}
                className="w-full bg-muted text-foreground py-3 rounded-full font-medium hover:bg-muted/80 transition-colors"
              >
                Iniciar nova conversa
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
