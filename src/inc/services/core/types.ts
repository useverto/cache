export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;
export type UnionToOvlds<U> = UnionToIntersection<U extends any ? (f: U) => void : never>;

export type PopUnion<U> = UnionToOvlds<U> extends (a: infer A) => void ? A : never;

export type UnionConcat<U extends string, Sep extends string> = PopUnion<U> extends infer SELF
    ? SELF extends string
        ? Exclude<U, SELF> extends never
            ? SELF
            :
            | `${UnionConcat<Exclude<U, SELF>, Sep>}${Sep}${SELF}`
            | UnionConcat<Exclude<U, SELF>, Sep>
            | SELF
        : never
    : never;
