import type {ApiError} from "../../../backend/bindings/ApiError";

export default class Api {
    static async get<T>(url: string): Promise<T> {
        return await fetch(url).then(res => res.json())
    }

    static async post<T = undefined>(url: string, body: any): Promise<T> {
        let response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            throw await response.json() as ApiError
        }

        if (response.body) {
            return await response.json() as T
        }

        // This type safety is a lie, but I don't want to have to check for undefined every time I get a good response
        return undefined as T
    }

}