import api from "./api"
import type { Transaction } from "./types"

export const transactionApi = {
    getLastTransaction: async () => {
        try {
            const { data } = await api.get<Transaction>("/mobcash/last-transaction")
            return data ?? null
        } catch (error: any) {
            // 404 means no transaction exists — return null silently
            if (error?.response?.status === 404) return null
            // For any other error also suppress, so the dialog is never shown
            return null
        }
    },

    cancelTransaction: async (reference: string) => {
        const { data } = await api.post("/mobcash/cancel-transaction", {
            reference,
        })
        return data
    },

    finalizeTransaction: async (reference: string) => {
        const { data } = await api.post<Transaction>("/mobcash/finalize-transaction-user", {
            reference,
        })
        return data
    },
}