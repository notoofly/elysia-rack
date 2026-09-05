/**
 * Panel form logic: collect the body from a form and fill a form from a row.
 * Used directly by the browser bundle (client/panel.ts).
 */
export declare function collectFormBody(form: any): {
    body?: Record<string, unknown>;
    error?: string;
};
export declare function fillForm(form: any, row: Record<string, unknown>): void;
