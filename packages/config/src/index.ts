export const APP_ENVIRONMENTS = [
"development",
"staging",
"production"
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
