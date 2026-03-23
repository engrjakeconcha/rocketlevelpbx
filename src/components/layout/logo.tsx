export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-semibold">
        RL
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">RocketLevel AI</div>
        <div className="text-base font-semibold text-foreground">Routing Console</div>
      </div>
    </div>
  );
}
