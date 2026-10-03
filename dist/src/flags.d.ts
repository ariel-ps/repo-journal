export type GlobalFlags = {
    stripped: string[];
    plain: boolean;
    json: boolean;
};
export declare function parseGlobalFlags(args: string[]): GlobalFlags;
export declare function takeFlag(stripped: string[], name: string): {
    args: string[];
    present: boolean;
};
