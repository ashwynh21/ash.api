export interface Return<T> {
    message?: string;
    payload?: Partial<T> | Array<Partial<T>> | unknown;
    debug?: string | Error;
}
