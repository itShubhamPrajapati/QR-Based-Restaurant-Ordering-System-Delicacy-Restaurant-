import { motion } from 'framer-motion'

export default function LiquidBackground() {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden bg-[#050505]">
      {/* Orb 1: Glowing Indigo */}
      <motion.div
        animate={{
          x: [0, 90, -50, 0],
          y: [0, -70, 110, 0],
          scale: [1, 1.25, 0.85, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-indigo-600/20 blur-[120px] sm:blur-[140px]"
      />
      {/* Orb 2: Glowing Rose */}
      <motion.div
        animate={{
          x: [0, -110, 70, 0],
          y: [0, 90, -60, 0],
          scale: [1, 0.85, 1.25, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-1/4 right-1/4 w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full bg-rose-500/10 blur-[130px] sm:blur-[150px]"
      />
      {/* Orb 3: Accent Amber */}
      <motion.div
        animate={{
          x: [0, 50, -70, 0],
          y: [0, 80, -90, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/3 right-1/3 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] rounded-full bg-indigo-500/10 blur-[90px] sm:blur-[110px]"
      />
    </div>
  )
}
