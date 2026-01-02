import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function saveData(key: string, value: string) {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    // Use SecureStore for Android and iOS
    try {
      SecureStore.setItem(key, value);
      console.log("Data saved securely on mobile!");
    } catch (error) {
      console.error("Failed to save data on SecureStore:", error);
    }
  } else if (Platform.OS === "web") {
    // Use localStorage for Web
    try {
      localStorage.setItem(key, value);
      console.log("Data saved on localStorage for web!");
    } catch (error) {
      console.error("Failed to save data on localStorage:", error);
    }
  }
}

export function getData(key: string) {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    // Retrieve data from SecureStore on mobile
    try {
      const value = SecureStore.getItem(key);
      if (value) {
        console.log("Data retrieved from SecureStore:", value);
      } else {
        console.log('No data found in SecureStore for "' + key + '".');
      }
      return value;
    } catch (error) {
      console.error("Failed to retrieve data from SecureStore:", error);
    }
  } else if (Platform.OS === "web") {
    // Retrieve data from localStorage on web
    try {
      const value = localStorage.getItem(key);
      if (value) {
        console.log("Data retrieved from localStorage:", value);
      } else {
        console.log("No data found in localStorage.");
      }
      return value;
    } catch (error) {
      console.error("Failed to retrieve data from localStorage:", error);
    }
  }
}

export async function deleteData(key: string) {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    await SecureStore.deleteItemAsync(key);
  } else if (Platform.OS === "web") {
    localStorage.removeItem(key);
  }
}
