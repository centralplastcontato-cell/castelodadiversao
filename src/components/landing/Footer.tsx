import { campaignConfig } from "@/config/campaignConfig";
import logoCastelo from "@/assets/logo-castelo.png";

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
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
            <a
              href="https://www.instagram.com/castelodadiversao?igsh=bXFiaHU5dmxjdGsz&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-lg"
            >
              Instagram
            </a>
            <a
              href="https://www.facebook.com/share/1G4d6VRmrF/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-lg"
            >
              Facebook
            </a>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a
              href="https://wa.me/5515991336278"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-colors text-sm font-medium"
            >
              📍 WhatsApp Manchester
            </a>
            <a
              href="https://wa.me/5515974034646"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-colors text-sm font-medium"
            >
              📍 WhatsApp Trujilo
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
