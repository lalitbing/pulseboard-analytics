"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
function requireEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`${name} is not set`);
    return v;
}
exports.supabase = (0, supabase_js_1.createClient)(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_KEY"));
