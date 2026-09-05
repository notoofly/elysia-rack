export interface DataTableProps {
    columns: string[];
    rows: Record<string, unknown>[];
    sortable?: readonly string[];
    params: Record<string, unknown>;
    selectable?: boolean;
    editable?: boolean;
    primaryKey?: string;
}
export declare function DataTable({ columns, rows, sortable, params, selectable, editable, primaryKey, }: DataTableProps): import("react").JSX.Element;
