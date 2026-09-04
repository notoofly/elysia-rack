export interface DashboardProps {
  name?: string;
}

export default async function Dashboard(props: DashboardProps) {
  return (
    <div className="koran-paper font-koran-body text-foreground flex min-h-screen items-center justify-center p-6">
      <div className="bg-card border-border max-w-lg rounded-xl border px-8 py-12 text-center shadow-sm">
        <p className="text-text-muted text-xs font-semibold tracking-widest uppercase">Dashboard</p>
        <h1 className="font-koran mt-2 text-4xl font-black tracking-tight">Coming Soon</h1>
        <p className="text-text-muted mt-3 text-sm leading-relaxed">
          {props.name ? `${props.name} — ` : ""}This dashboard is coming soon. Your panels are available via the sidebar in each resource view.
        </p>
        <div className="mt-6 flex justify-center">
          <span className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-semibold">Stay tuned</span>
        </div>
      </div>
    </div>
  );
}
