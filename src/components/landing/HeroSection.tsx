import { motion } from "framer-motion";
import { campaignConfig } from "@/config/campaignConfig";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroSectionProps {
  onCtaClick: () => void;
}

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-castle/40 to-background/90" />
      </div>

      {/* Floating Confetti Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: ['hsl(330 85% 55%)', 'hsl(40 95% 55%)', 'hsl(280 65% 50%)', 'hsl(175 70% 45%)'][i % 4],
              left: `${Math.random() * 100}%`,
              top: `-5%`,
            }}
            animate={{
              y: ['0vh', '110vh'],
              rotate: [0, 720],
              opacity: [1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 section-container text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          {/* Tag */}
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block bg-secondary text-secondary-foreground px-6 py-2 rounded-full text-lg font-bold shadow-card"
          >
            {campaignConfig.tagline}
          </motion.span>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-primary-foreground drop-shadow-lg"
          >
            {campaignConfig.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-2xl md:text-3xl lg:text-4xl font-display text-primary-foreground/90"
          >
            {campaignConfig.subtitle}
          </motion.p>

          {/* Offer Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="inline-block bg-card/95 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-floating mt-8"
          >
            <p className="text-lg md:text-xl text-muted-foreground mb-2">Pacote especial a partir de</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className="text-2xl text-muted-foreground line-through">
                {campaignConfig.offer.originalPrice}
              </span>
              <span className="text-4xl md:text-5xl font-bold text-primary">
                {campaignConfig.offer.promoPrice}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Válido até {campaignConfig.offer.validUntil}
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="pt-6"
          >
            <button
              onClick={onCtaClick}
              className="btn-cta text-xl md:text-2xl animate-bounce-gentle"
            >
              🎉 Quero Garantir Minha Data
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-8 h-12 rounded-full border-2 border-primary-foreground/50 flex items-start justify-center p-2"
          >
            <div className="w-2 h-3 bg-primary-foreground/50 rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
