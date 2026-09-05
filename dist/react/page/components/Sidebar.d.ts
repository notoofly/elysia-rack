export interface SidebarItem {
    id: string;
    label: string;
    icon?: string;
    href: string;
    active?: boolean;
    children?: SidebarItem[];
}
export interface SidebarGroup {
    name: string;
    items: SidebarItem[];
}
export interface SidebarProps {
    title: string;
    groups: SidebarGroup[];
}
export declare function Sidebar({ title, groups }: SidebarProps): import("react").JSX.Element;
