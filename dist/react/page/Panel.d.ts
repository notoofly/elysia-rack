import type { FieldDescriptor } from "../../rack/adapters/index";
export interface PanelProps {
    resource?: string;
    metadata?: {
        label?: string;
        pluralLabel?: string;
        group?: string;
    };
    operations?: {
        list?: boolean;
        detail?: boolean;
        create?: boolean;
        replace?: boolean;
        update?: boolean;
        delete?: boolean;
    };
    primaryKey?: string;
    query?: {
        searchable?: readonly string[];
        filterable?: readonly string[];
        sortable?: readonly string[];
        pagination?: {
            default?: number;
            max?: number;
        };
    };
    params?: Record<string, unknown>;
    queryUrl?: string;
    fields?: FieldDescriptor[];
    deletedAtField?: string;
    load?: (input: Record<string, unknown>) => Promise<{
        data: unknown[];
        total: number;
    }>;
}
export default function Panel(props: PanelProps): Promise<import("react").JSX.Element>;
