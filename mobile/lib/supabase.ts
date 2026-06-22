import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const authStorageKey = "kampusraf.auth.session";
const secureStoreChunkSize = 1800;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Supabase env bilgileri eksik. mobile/.env dosyasını kontrol et.");
}

function getSafeSecureStoreKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

function getChunkCountKey(key: string) {
  return `${key}.chunk_count`;
}

function getChunkKey(key: string, index: number) {
  return `${key}.chunk_${index}`;
}

async function deleteStoredChunks(key: string) {
  const countKey = getChunkCountKey(key);
  const countValue = await SecureStore.getItemAsync(countKey);
  const count = Number(countValue || 0);

  if (Number.isInteger(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(getChunkKey(key, index))
      )
    );
  }

  await SecureStore.deleteItemAsync(countKey);
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const safeKey = getSafeSecureStoreKey(key);
    const countValue = await SecureStore.getItemAsync(getChunkCountKey(safeKey));
    const count = Number(countValue || 0);

    if (Number.isInteger(count) && count > 0) {
      const chunks = await Promise.all(
        Array.from({ length: count }, (_, index) =>
          SecureStore.getItemAsync(getChunkKey(safeKey, index))
        )
      );

      if (chunks.some((chunk) => chunk == null)) {
        await deleteStoredChunks(safeKey);
        return null;
      }

      return chunks.join("");
    }

    return await SecureStore.getItemAsync(safeKey);
  },
  setItem: async (key: string, value: string) => {
    const safeKey = getSafeSecureStoreKey(key);

    await deleteStoredChunks(safeKey);

    if (value.length <= secureStoreChunkSize) {
      await SecureStore.setItemAsync(safeKey, value);
      return;
    }

    await SecureStore.deleteItemAsync(safeKey);

    const chunks = value.match(new RegExp(`.{1,${secureStoreChunkSize}}`, "g")) || [];

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(getChunkKey(safeKey, index), chunk)
      )
    );
    await SecureStore.setItemAsync(getChunkCountKey(safeKey), String(chunks.length));
  },
  removeItem: async (key: string) => {
    const safeKey = getSafeSecureStoreKey(key);

    await deleteStoredChunks(safeKey);
    await SecureStore.deleteItemAsync(safeKey);
  },
};

const WebLocalStorageAdapter = {
  getItem: async (key: string) => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storageKey: authStorageKey,
    storage: Platform.OS === "web" ? WebLocalStorageAdapter : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
