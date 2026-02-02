import { useEffect } from "react";
import { Instagram } from "lucide-react";

export const InstagramSection = () => {
  useEffect(() => {
    // Load Elfsight script
    const script = document.createElement("script");
    script.src = "https://elfsightcdn.com/platform.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://elfsightcdn.com/platform.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

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
          <div
            className="elfsight-app-16022b61-2da1-4f75-bbc5-25aa62325a1f"
            data-elfsight-app-lazy
          />
        </div>
      </div>
    </section>
  );
};
