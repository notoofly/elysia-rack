export interface BreadcrumbItem {
    label: string;
    href?: string;
}
export declare function Breadcrumb({ trail }: {
    trail: BreadcrumbItem[];
}): import("react").JSX.Element;
