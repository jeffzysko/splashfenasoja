import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-sky-50 to-white text-center"
    >
      <div className="absolute top-6 right-6">
        <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1 rounded-full">
          Stand Splash · FENASOJA 2026
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-sky-950 mb-2">
          splash<span className="text-orange-500">.</span>
        </h1>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-sky-950 mb-4 max-w-sm">
        Bora descobrir a piscina ideal pro seu quintal?
      </h1>
      <p className="text-lg text-sky-700 mb-8 max-w-md">
        São 4 perguntinhas. Em menos de 1 minuto a gente já manda o catálogo pro seu WhatsApp.
      </p>

      <Button size="lg" className="w-full max-w-xs bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg rounded-2xl shadow-lg transition-all active:scale-95">
        Bora começar
      </Button>
    </motion.div>
  );
}
