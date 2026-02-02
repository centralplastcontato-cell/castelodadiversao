import { motion } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";
import { campaignConfig } from "@/config/campaignConfig";

interface UrgencySectionProps {
  onCtaClick: () => void;
}

export function UrgencySection({ onCtaClick }: UrgencySectionProps) {
  return (
    <section className="py-16 bg-gradient-to-br from-primary/20 to-primary/40 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-20 h-20 rounded-full bg-primary-foreground/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="inline-flex items-center gap-2 bg-primary-foreground/20 backdrop-blur-sm text-primary-foreground px-6 py-3 rounded-full mb-6"
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold text-lg">ATENÇÃO!</span>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground mb-4">
            {campaignConfig.urgency.message}
          </h2>

          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-primary-foreground/20 backdrop-blur-sm rounded-2xl p-6 text-center min-w-[150px]"
            >
              <p className="text-5xl font-display font-bold text-primary-foreground">
                {campaignConfig.urgency.spotsLeft}
              </p>
              <p className="text-primary-foreground/80 font-medium">vagas restantes</p>
            </motion.div>

            <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-2xl p-6 text-center flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary-foreground" />
              <div className="text-left">
                <p className="text-xl font-bold text-primary-foreground">
                  {campaignConfig.urgency.deadline}
                </p>
                <p className="text-primary-foreground/80 text-sm">Não perca!</p>
              </div>
            </div>
          </div>

          <motion.button
            onClick={onCtaClick}
            className="bg-secondary text-secondary-foreground font-bold py-4 px-10 rounded-full text-xl shadow-floating hover:scale-105 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Garantir Minha Vaga Agora! 🚀
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
