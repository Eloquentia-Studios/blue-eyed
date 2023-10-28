import {createMutation, type CreateMutationResult, createQuery} from "@tanstack/svelte-query";
import type { UserRegistrationInfo } from "../../../backend/bindings/UserRegistrationInfo"
import type {ApiError} from "../../../backend/bindings/ApiError";
import Api from "./api";

export default class Setup {
    static createAdminMutation() {
        return createMutation<undefined, ApiError | Error, UserRegistrationInfo>({
            mutationKey: ['setupAdminUser'],
            mutationFn: (registrationInfo: UserRegistrationInfo) => Api.post<undefined>('api/v1/setup/admin', registrationInfo)
        })
    }

    static setupCompleteQuery()  {
        return createQuery<boolean>({
            queryKey: ['isSetupComplete'],
            queryFn: () => Api.get<boolean>('api/v1/setup/complete')
        });
    }
}

