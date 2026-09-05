import { pageWindow } from "./href";
export interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    params: Record<string, unknown>;
}
export { pageWindow };
export declare function Pagination({ page, totalPages, total, limit, params }: PaginationProps): import("react").JSX.Element;
