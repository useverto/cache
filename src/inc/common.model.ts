export type Class<T> = { new (...args: any[]): T; };

export interface ContractResult<T = any> {
    state: T;
    validity?: Record<string, boolean>;
}

export interface PromiseContext {
    promise: any;
    resolver: (data: any) => void;
    catcher: (data: any) => void;
}
