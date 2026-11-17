import Constants from "expo-constants";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const EAS_PROJECT_ID = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) || undefined;
