export interface ToolbarProps {
    searchable?: readonly string[];
    filterable?: readonly string[];
    sortable?: readonly string[];
    params: Record<string, unknown>;
}
export declare function Toolbar({ searchable, filterable, sortable, params }: ToolbarProps): import("react").JSX.Element | null;
