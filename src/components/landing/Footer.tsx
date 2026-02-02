import { campaignConfig } from "@/config/campaignConfig";
import logoCastelo from "@/assets/logo-castelo.jpeg";

export function Footer() {
  return (
    <footer className="bg-foreground text-primary-foreground py-12">
      <div className="section-container">
        <div className="text-center">
          <img 
            src={logoCastelo} 
            alt="Castelo da Diversão" 
            className="w-32 md:w-40 mx-auto mb-4"
          />
          <p className="text-primary-foreground/70 mb-6 max-w-md mx-auto">
            Transformando sonhos em festas inesquecíveis há mais de 15 anos.
          </p>
          
          <div className="flex justify-center gap-6 mb-8">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-lg"
            >
              Instagram
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-lg"
            >
              Facebook
            </a>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-lg"
            >
              WhatsApp
            </a>
          </div>

          <div className="border-t border-primary-foreground/20 pt-6">
            <p className="text-sm text-primary-foreground/50">
              Campanha: {campaignConfig.campaignName}
            </p>
            <p className="text-sm text-primary-foreground/50 mt-1">
              © {new Date().getFullYear()} Castelo da Diversão. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
