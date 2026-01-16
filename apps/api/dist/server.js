"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env ONLY in local
if (process.env.NODE_ENV !== "production") {
    dotenv_1.default.config();
}
const app_1 = __importDefault(require("./app"));
const cors_1 = __importDefault(require("cors"));
const PORT = process.env.PORT || 8080;
app_1.default.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST"]
}));
app_1.default.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        env: process.env.NODE_ENV || "dev"
    });
});
app_1.default.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
