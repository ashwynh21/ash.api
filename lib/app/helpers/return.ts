export interface Return<T> {
    message?: string;
    payload?: Partial<T> | Array<Partial<T>>;
    debug?: string | Error;
}
