import { motion } from 'framer-motion';

const Background = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {/* Mesh Gradient Blobs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute"
        style={{
          top: '-10%',
          left: '-10%',
          width: '50%',
          height: '50%',
          borderRadius: '100%',
          opacity: 0.2,
          background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          filter: 'blur(80px)'
        }}
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute"
        style={{
          bottom: '-10%',
          right: '-10%',
          width: '60%',
          height: '60%',
          borderRadius: '100%',
          opacity: 0.2,
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          filter: 'blur(100px)'
        }}
      />
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute"
        style={{
          top: '20%',
          right: '10%',
          width: '30%',
          height: '30%',
          borderRadius: '100%',
          opacity: 0.1,
          background: 'radial-gradient(circle, var(--danger) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0" 
        style={{
          opacity: 0.03,
          backgroundImage: `linear-gradient(var(--text-main) 1px, transparent 1px), linear-gradient(90deg, var(--text-main) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
};

export default Background;
