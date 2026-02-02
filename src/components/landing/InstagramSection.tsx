import { Instagram } from "lucide-react";

export const InstagramSection = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Instagram className="w-8 h-8 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Siga-nos no Instagram
            </h2>
          </div>
          <p className="text-muted-foreground text-lg">
            Acompanhe nossas festas e novidades em{" "}
            <a
              href="https://instagram.com/castelodadiversao"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold hover:underline"
            >
              @castelodadiversao
            </a>
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <iframe
            src="https://16022b612da14f75bbc525aa62325a1f.elf.site"
            title="Feed do Instagram"
            className="w-full border-0 rounded-lg"
            style={{ minHeight: "600px" }}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};
