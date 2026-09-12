import { cn } from "@/lib/utils/cn";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary"|"ghost"|"danger"; size?: "sm"|"md"; loading?: boolean;
}
export function Button({ children, variant="ghost", size="md", loading, className, disabled, ...props }: ButtonProps) {
  const base = "inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50";
  const sizes = { sm:"text-[11px] px-3 py-1.5", md:"text-[12px] px-4 py-2.5" };
  const variants = {
    primary:"text-white", ghost:"border", danger:"text-red-400 border border-red-500/20 bg-red-500/5",
  };
  return (
    <button {...props} disabled={disabled||loading} className={cn(base,sizes[size],variants[variant],className)}
      style={variant==="primary"?{background:"linear-gradient(135deg,#ff8d3d,#ff6500)",boxShadow:"0 8px 24px rgba(255,106,0,.18)"}:variant==="ghost"?{borderColor:"var(--border-2)",color:"var(--text-2)",background:"rgba(255,255,255,.035)"}:undefined}>
      {loading ? <span className="animate-spin">⟳</span> : children}
    </button>
  );
}
