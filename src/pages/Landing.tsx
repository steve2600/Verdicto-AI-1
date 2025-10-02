import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Scale, Shield, Sparkles, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { scrollY } = useScroll();

  // Parallax effects
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const featuresY = useTransform(scrollY, [200, 600], [100, 0]);
  const featuresOpacity = useTransform(scrollY, [200, 500], [0, 1]);

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  // Generate animated path data with more flowing curves
  const generatePaths = () => {
    const paths = [];
    const numPaths = 15;
    
    for (let i = 0; i < numPaths; i++) {
      const startY = (i / numPaths) * 100;
      const midY = startY + (Math.random() - 0.5) * 40;
      const endY = startY + (Math.random() - 0.5) * 30;
      
      // Create more complex curved paths
      paths.push({
        id: i,
        d: `M 0 ${startY} Q 25 ${midY}, 50 ${(startY + endY) / 2} T 100 ${endY}`,
        duration: 4 + Math.random() * 6,
        delay: Math.random() * 3,
      });
    }
    return paths;
  };

  const paths = generatePaths();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Animated Background Paths */}
      <div className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(120, 120, 120, 0)" />
              <stop offset="50%" stopColor="rgba(180, 180, 180, 0.5)" />
              <stop offset="100%" stopColor="rgba(120, 120, 120, 0)" />
            </linearGradient>
          </defs>
          {paths.map((path) => (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="url(#pathGradient)"
              strokeWidth="0.1"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 0],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: path.duration,
                delay: path.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </svg>
      </div>

      {/* Hero Section */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center"
      >
        {/* Floating Legal Icons */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-[10%] opacity-10"
        >
          <Shield className="w-24 h-24 text-gray-400" />
        </motion.div>

        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-32 right-[15%] opacity-10"
        >
          <Zap className="w-20 h-20 text-gray-400" />
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
          className="mb-8 relative"
        >
          <div className="relative w-24 h-24 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
            <Scale className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-6xl md:text-8xl font-black mb-6 text-white"
        >
          Justice, Accelerated by AI
        </motion.h1>

        {/* Subheading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-12 px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
        >
          <p className="text-2xl md:text-3xl font-light text-gray-300 tracking-wide">
            Transparent. Accessible. Unbiased.
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleCTA}
            size="lg"
            className="relative px-12 py-6 text-xl font-bold bg-white text-black hover:bg-gray-200 rounded-full shadow-2xl border-2 border-white/20 overflow-hidden group"
          >
            <span className="relative z-10">
              {isAuthenticated ? "Open Dashboard" : "Enter Platform"}
            </span>
          </Button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-12"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-gray-400"
          >
            <span className="text-sm font-light">Scroll to explore</span>
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        style={{ y: featuresY, opacity: featuresOpacity }}
        className="relative z-10 py-32 px-4"
      >
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-bold text-center mb-16 text-white"
          >
            Powered by Advanced AI
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Scale,
                title: "Case Prediction",
                description: "AI-powered analysis of legal outcomes with unprecedented accuracy",
              },
              {
                icon: Shield,
                title: "Bias Detection",
                description: "Identify and eliminate bias for truly fair legal analysis",
              },
              {
                icon: Sparkles,
                title: "Explainable AI",
                description: "Transparent reasoning you can trust and understand",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative"
              >
                <div className="relative h-full p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Final CTA Section */}
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative z-10 py-32 px-4"
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-16 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="relative">
              <h2 className="text-5xl font-bold mb-6 text-white">
                Ready to Transform Legal Analysis?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Join the future of justice with AI-powered insights
              </p>
              <Button
                onClick={handleCTA}
                size="lg"
                className="px-12 py-6 text-xl font-bold bg-white text-black hover:bg-gray-200 rounded-full shadow-2xl border-2 border-white/20"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              </Button>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}