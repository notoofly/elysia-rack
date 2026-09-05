import type { ReactRack } from "../types";
export interface DashboardProps {
    name?: string;
    resource?: string;
    donate?: ReactRack.DonateConfig;
}
export default function Dashboard(props: DashboardProps): Promise<import("react").JSX.Element>;
