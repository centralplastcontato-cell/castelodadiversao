import { motion } from "framer-motion";
import { castleBenefits } from "@/config/campaignConfig";

export function BenefitsSection() {
  return (
    <section className="py-20 bg-card">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Por que escolher o <span className="gradient-text">Castelo da Diversão</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Há mais de 15 anos transformando sonhos em realidade com festas inesquecíveis
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {castleBenefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="card-festive p-6 text-center group cursor-default"
            >
              <motion.span
                className="text-5xl block mb-4"
                whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
              >
                {benefit.icon}
              </motion.span>
              <h3 className="text-xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-8"
        >
          <div className="flex items-center gap-3 bg-muted px-6 py-3 rounded-full">
            <span className="text-2xl">⭐</span>
            <span className="font-bold text-foreground">4.9/5 no Google</span>
          </div>
          <div className="flex items-center gap-3 bg-muted px-6 py-3 rounded-full">
            <span className="text-2xl">🎉</span>
            <span className="font-bold text-foreground">+5.000 festas realizadas</span>
          </div>
          <div className="flex items-center gap-3 bg-muted px-6 py-3 rounded-full">
            <span className="text-2xl">❤️</span>
            <span className="font-bold text-foreground">98% de satisfação</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
