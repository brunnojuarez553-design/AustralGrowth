import { cn } from "@/lib/utils/cn";
type TagVariant = "green"|"amber"|"red"|"blue"|"purple"|"gray";
const V: Record<TagVariant,string> = {
  green:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber:"bg-amber-500/10 text-amber-400 border-amber-500/20",
  red:"bg-red-500/10 text-red-400 border-red-500/20",
  blue:"bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  purple:"bg-purple-500/10 text-purple-400 border-purple-500/20",
  gray:"border-[var(--border-2)] text-[var(--text-2)]",
};
interface TagProps { children: React.ReactNode; variant?: TagVariant; className?: string; }
export function Tag({ children, variant="gray", className }: TagProps) {
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",V[variant],className)}>{children}</span>;
}
