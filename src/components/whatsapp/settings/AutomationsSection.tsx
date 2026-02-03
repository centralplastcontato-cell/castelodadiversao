import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, Forward, Zap } from "lucide-react";

export function AutomationsSection() {
  return (
    <div className="space-y-6">
      {/* Header informativo */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Automações em Desenvolvimento</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Estamos trabalhando em funcionalidades de automação para melhorar ainda mais seu atendimento. 
              Em breve você poderá configurar respostas automáticas, chatbots e muito mais.
            </p>
          </div>
        </div>
      </div>

      {/* Chatbot Automático */}
      <Card className="opacity-75">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Chatbot Automático
            </CardTitle>
            <Badge variant="secondary">Em breve</Badge>
          </div>
          <CardDescription>
            Configure um bot para responder perguntas frequentes automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Respostas inteligentes baseadas em palavras-chave</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Menu de opções para autoatendimento</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Coleta automática de informações do lead</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Transferência automática para atendente quando necessário</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Respostas Fora do Horário */}
      <Card className="opacity-75">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Respostas Fora do Horário
            </CardTitle>
            <Badge variant="secondary">Em breve</Badge>
          </div>
          <CardDescription>
            Envie mensagens automáticas fora do expediente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Defina horários de funcionamento por unidade</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Mensagem personalizada para fora do expediente</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Configurações específicas para finais de semana e feriados</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Encaminhamento Automático */}
      <Card className="opacity-75">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Forward className="w-5 h-5" />
              Encaminhamento Automático
            </CardTitle>
            <Badge variant="secondary">Em breve</Badge>
          </div>
          <CardDescription>
            Direcione conversas automaticamente para o responsável correto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Regras de encaminhamento baseadas em palavras-chave</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Distribuição automática entre atendentes</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Priorização de leads VIP</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
