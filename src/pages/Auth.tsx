import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, ArrowLeft } from "lucide-react";
import { z } from "zod";
import logoCastelo from "@/assets/logo-castelo.png";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate("/admin");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar o cadastro.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        navigate("/admin");
      }
    } catch (error: any) {
      let message = "Ocorreu um erro. Tente novamente.";
      
      if (error.message?.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos.";
      } else if (error.message?.includes("User already registered")) {
        message = "Este email já está cadastrado.";
      } else if (error.message?.includes("Email not confirmed")) {
        message = "Por favor, confirme seu email antes de entrar.";
      }

      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-background to-castle/10 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements - warm colors only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-secondary/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-castle/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-festive/15 rounded-full blur-2xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 hover:bg-card/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao site
        </Button>

        <div className="relative rounded-3xl overflow-hidden shadow-floating">
          {/* Card background with warm gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-festive/20 to-castle/30 p-[2px] rounded-3xl">
            <div className="w-full h-full bg-card rounded-3xl" />
          </div>
          
          {/* Card content */}
          <div className="relative bg-card/95 backdrop-blur-sm p-8 rounded-3xl border border-secondary/20">
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-gradient-to-r from-secondary/25 via-festive/25 to-castle/25 rounded-full blur-xl opacity-60" />
                <img 
                  src={logoCastelo} 
                  alt="Castelo da Diversão" 
                  className="w-32 mx-auto mb-4 relative drop-shadow-lg"
                />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Área Administrativa
              </h1>
              <p className="text-muted-foreground mt-2">
                {isSignUp ? "Crie sua conta" : "Entre para gerenciar leads"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background/50 border-secondary/30 focus:border-festive/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-background/50 border-secondary/30 focus:border-festive/50"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-cta hover:opacity-90 text-white font-semibold py-5 rounded-xl shadow-button hover:shadow-floating transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSignUp ? (
                  "Criar conta"
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-festive hover:underline text-sm font-medium"
              >
                {isSignUp
                  ? "Já tem uma conta? Entre aqui"
                  : "Não tem conta? Cadastre-se"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
