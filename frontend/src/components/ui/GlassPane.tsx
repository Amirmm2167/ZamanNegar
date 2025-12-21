import clsx from "clsx";

interface GlassPaneProps {
  children: React.ReactNode;
  className?: string;
  intensity?: "low" | "medium" | "high";
}

export default function GlassPane({ children, className, intensity = "medium" }: GlassPaneProps) {
  const baseStyles = "transition-all duration-200";
  
  const intensityStyles = {
    low: "bg-black/30 backdrop-blur-sm",
    medium: "bg-[#0f1115]/60 backdrop-blur-md border border-white/10 shadow-2xl",
    high: "bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10",
  };

  return (
    <div className={clsx(baseStyles, intensityStyles[intensity], className)}>
      {children}
    </div>
  );
}