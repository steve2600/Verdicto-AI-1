import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Scale, Shield, Zap, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    const canvas = document.getElementById("particles") as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    }> = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${Math.random() * 0.5 + 0.3})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 animated-gradient -z-10" />
      <canvas
        id="particles"
        className="fixed inset-0 -z-10 opacity-60"
      />

      {/* Hero Section */}
      <motion.section
        style={{ y, opacity }}
        className="min-h-screen flex flex-col items-center justify-center px-4 relative"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* Logo */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 flex justify-center"
          >
            <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center neon-glow">
              <Scale className="h-12 w-12 text-primary" />
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-6xl md:text-8xl font-bold mb-6 neon-text leading-tight"
          >
            Justice, Accelerated
            <br />
            <span className="text-primary">by AI</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto"
          >
            Transparent. Accessible. Unbiased.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              size="lg"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
              className="text-lg px-8 py-6 neon-glow group"
            >
              {isAuthenticated ? "Open Dashboard" : "Enter Platform"}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Floating Elements */}
          <motion.div
            animate={{
              y: [0, -20, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/4 left-10 hidden lg:block"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center neon-glow">
              <Shield className="h-8 w-8 text-secondary" />
            </div>
          </motion.div>

          <motion.div
            animate={{
              y: [0, 20, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute top-1/3 right-10 hidden lg:block"
          >
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center neon-glow">
              <Zap className="h-10 w-10 text-accent" />
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-primary/50 rounded-full flex items-start justify-center p-2"
          >
            <motion.div className="w-1 h-2 bg-primary rounded-full" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-4 neon-text">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-muted-foreground">
              Cutting-edge technology for legal intelligence
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Scale,
                title: "Case Prediction",
                description:
                  "AI-powered analysis of legal outcomes based on historical data and precedents",
                color: "primary",
              },
              {
                icon: Shield,
                title: "Bias Detection",
                description:
                  "Advanced algorithms identify and flag potential biases in legal reasoning",
                color: "secondary",
              },
              {
                icon: Sparkles,
                title: "Explainable AI",
                description:
                  "Transparent reasoning and evidence-based predictions you can trust",
                color: "accent",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
                className="glass-strong p-8 rounded-2xl neon-glow cursor-pointer"
              >
                <div
                  className={`w-16 h-16 rounded-xl bg-${feature.color}/20 flex items-center justify-center mb-6 neon-glow`}
                >
                  <feature.icon className={`h-8 w-8 text-${feature.color}`} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="min-h-[60vh] flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-5xl font-bold mb-6 neon-text">
            Ready to Transform Legal Analysis?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join the future of legal intelligence with LexAI
          </p>
          <Button
            size="lg"
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
            className="text-lg px-8 py-6 neon-glow group"
          >
            {isAuthenticated ? "Go to Dashboard" : "Get Started"}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </section>
    </div>
  );
}