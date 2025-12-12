import React, { useEffect, useRef } from 'react';

interface StaticOverlayProps {
    distance: number;
}

const StaticOverlay: React.FC<StaticOverlayProps> = ({ distance }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const distanceRef = useRef(distance);

  // Sync ref with prop for the animation loop
  useEffect(() => {
      distanceRef.current = distance;
  }, [distance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate noise texture (one-time)
    const noiseSize = 256;
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = noiseSize;
    noiseCanvas.height = noiseSize;
    const noiseCtx = noiseCanvas.getContext('2d')!;
    const idata = noiseCtx.createImageData(noiseSize, noiseSize);
    const buffer32 = new Uint32Array(idata.data.buffer);
    
    for (let i = 0; i < buffer32.length; i++) {
       // Random white noise
       if (Math.random() < 0.5) {
          // AABBGGRR - White
          buffer32[i] = 0xFFFFFFFF; 
       } else {
          buffer32[i] = 0x00000000; // Transparent
       }
    }
    noiseCtx.putImageData(idata, 0, 0);

    let animationId: number;

    const render = () => {
       if (!canvas.width) return;
       
       const dist = distanceRef.current;
       
       // Calculate signal strength (Simulated Analog RSSI)
       // Range approx 300m for clear video, then degrades
       const maxRange = 300;
       const normalizedDist = Math.max(0, dist - 50) / maxRange; 
       
       // Base static increases with distance^2 (Inverse square law approximation for signal loss)
       let staticIntensity = Math.min(0.9, Math.pow(normalizedDist, 2) * 0.8);
       
       // Add base noise floor (analog always has a bit)
       staticIntensity = Math.max(0.08, staticIntensity);

       // Random fluctuations (Interference spikes)
       if (Math.random() < staticIntensity * 0.5) {
           staticIntensity += Math.random() * 0.2;
       }

       // Clear
       ctx.clearRect(0, 0, canvas.width, canvas.height);

       // Apply dynamic opacity
       ctx.globalAlpha = Math.min(1.0, staticIntensity);

       // Draw noise pattern with random offset to create "snow"
       const offsetX = Math.floor(Math.random() * noiseSize);
       const offsetY = Math.floor(Math.random() * noiseSize);
       
       const pattern = ctx.createPattern(noiseCanvas, 'repeat');
       if (pattern) {
           const matrix = new DOMMatrix();
           matrix.translateSelf(offsetX, offsetY);
           pattern.setTransform(matrix);
           ctx.fillStyle = pattern;
           ctx.fillRect(0, 0, canvas.width, canvas.height);
       }
       
       // Add occasional horizontal banding (tracking error simulation)
       // Probability increases with static intensity
       if (Math.random() < staticIntensity * 0.1) {
           const bandY = Math.random() * canvas.height;
           const bandH = Math.random() * 50 + 10;
           ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
           ctx.fillRect(0, bandY, canvas.width, bandH);
       }

       // Rolling bars (common in analog)
       if (staticIntensity > 0.3 && Math.random() > 0.95) {
           ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
           ctx.fillRect(0, (Date.now() / 5) % canvas.height, canvas.width, 40);
       }

       animationId = requestAnimationFrame(render);
    };
    
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    render();

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
    }
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Vignette - always present to give depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]"></div>
        {/* Noise Canvas */}
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full mix-blend-overlay"
        />
    </div>
  );
};

export default StaticOverlay;
