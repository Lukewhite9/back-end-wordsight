declare class Client<T extends Record<string | number, unknown> = Record<string | number, unknown>> {
	constructor(url?: string);

	public get(key: keyof T, config: {
		raw: true
	}): Promise<string>;

	public get<K extends keyof T>(key: K, config?: {
		raw?: false
	}): Promise<T[K]>;

	public get<K extends keyof T>(key: K, config?: {
		raw?: boolean
	}): Promise<T[K] | string>;

	public set(entries: Partial<T>): Promise<void>;

	public delete(key: keyof T): Promise<void>;

	public list(config?: {
		prefix?: string
	}): Promise<(keyof T)[]>;

	public empty(): Promise<void>;

	public getAll(): Promise<T>;

	public deleteMany(keys: Array<keyof T>): Promise<void>;
}

export { Client };