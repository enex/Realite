import { deleteData, getData, saveData } from "./store";

const key = "pending_share_code";

export const getPendingShareCode = () => getData(key) ?? null;

export const setPendingShareCode = (code: string) => saveData(key, code);

export const clearPendingShareCode = () => deleteData(key);
