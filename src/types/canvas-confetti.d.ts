declare module "canvas-confetti" {
  type Options = {
    particleCount?: number;
    spread?: number;
    startVelocity?: number;
    scalar?: number;
    origin?: { x?: number; y?: number };
    ticks?: number;
    zIndex?: number;
    angle?: number;
    gravity?: number;
    drift?: number;
    shapes?: Array<"square" | "circle"> | string[];
    colors?: string[];
    disableForReducedMotion?: boolean;
    resize?: boolean;
    useWorker?: boolean;
  };

  // Basic callable signature
  function confetti(opts?: Options): void;

  export default confetti;
}
