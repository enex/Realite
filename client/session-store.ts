import { deleteData, getData, saveData } from "./store";

const key = "session_token";
export const getToken = () => getData(key);
export const deleteToken = () => deleteData(key);
export const setToken = (v: string) => saveData(key, v);
