interface StatBlockProps {
  label: string;
  value: string | number;
  icon?: string;
}

export default function StatBlock({ label, value, icon }: StatBlockProps) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-2">
      {icon && <iconify-icon icon={icon} width="20" class="text-slate-500" />}
      <div className="text-lg font-semibold tracking-tight">{value}</div>
      <div className="text-[0.6rem] text-slate-500 uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}
