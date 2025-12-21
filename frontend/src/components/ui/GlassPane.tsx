import clsx from "clsx";

interface GlassPaneProps {
  children: React.ReactNode;
  className?: string;
  // 👇 Added "login" to the allowed types here
  intensity?: "low" | "medium" | "high" | "login";
}

export default function GlassPane({ children, className, intensity = "medium" }: GlassPaneProps) {
  const baseStyles = "transition-all duration-200";
  
  const intensityStyles = {
    low: "bg-black/30 backdrop-blur-sm",
    medium: "bg-[#0f1115]/60 backdrop-blur-md border border-white/10 shadow-2xl",
    high: "bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10",
    // 👇 Added the specific style for the login box
    login: "bg-[#0a0c10]/80 backdrop-blur-xl border border-white/10 shadow-2xl",
  };

  return (
    // We use a safe access check just in case, though TS now guarantees it exists
    <div className={clsx(baseStyles, intensityStyles[intensity] || intensityStyles.medium, className)}>
      {children}
    </div>
  );
}