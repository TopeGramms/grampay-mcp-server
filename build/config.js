import dotenv from "dotenv";
dotenv.config();
const mode = (process.env.GRAMPAY_MODE ?? "mock").toLowerCase();
const maxCashoutUsd = Number(process.env.GRAMPAY_MAX_CASHOUT_USD ?? "1000");
export const CONFIG = {
    MODE: mode === "live" ? "live" : "mock",
    DEFAULT_BANK_NAME: process.env.GRAMPAY_DEFAULT_BANK_NAME ?? "Access Bank",
    DEFAULT_BANK_ACCOUNT: process.env.GRAMPAY_DEFAULT_BANK_ACCOUNT ?? "0785351096",
    MAX_CASHOUT_USD: Number.isFinite(maxCashoutUsd) && maxCashoutUsd > 0 ? maxCashoutUsd : 1000,
    USD_TO_NGN_RATE: Number(process.env.USD_TO_NGN_RATE ?? "1650"),
    IVORYPAY_SECRET_KEY: process.env.IVORYPAY_SECRET_KEY ?? undefined,
    IVORYPAY_ENV: process.env.IVORYPAY_ENV ?? "test",
};
//# sourceMappingURL=config.js.map