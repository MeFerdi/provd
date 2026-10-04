export declare const INTERNAL_PREFIXES: string[];
export declare const KEYED_PREFIXES: string[];
export declare const LIVE_ONLY_PREFIXES: string[];
export declare const HTTP_METHODS: string[];
export declare function isInternalPath(path: string): boolean;
export declare function authForPath(path: string): "key" | "public";
export declare function operationAnchor(method: string, path: string): string;
