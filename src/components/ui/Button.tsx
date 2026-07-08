import { cn } from "@/lib/utils/cn";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary"|"ghost"|"danger"; size?: "sm"|"md"; loading?: boolean;
}
export function Button({ children, variant="ghost", size="md", loading, className, disabled, ...props }: ButtonProps) {
  const base = "inline-flex items-center gap-1.5 rounded-[7px] font-medium transition-all cursor-pointer disabled:opacity-50";
  const sizes = { sm:"text-[11.5px] px-2.5 py-1", md:"text-[12.5px] px-3.5 py-1.5" };
  const variants = {
    primary:"text-white", ghost:"border", danger:"text-red-400 border border-red-500/20 bg-red-500/5",
  };
  return (
    <button {...props} disabled={disabled||loading} className={cn(base,sizes[size],variants[variant],className)}
      style={variant==="primary"?{background:"var(--accent)"}:variant==="ghost"?{borderColor:"var(--border-2)",color:"var(--text-2)",background:"transparent"}:undefined}>
      {loading ? <span className="animate-spin">⟳</span> : children}
    </button>
  );
}
