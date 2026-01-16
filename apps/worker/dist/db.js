"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveEvent = void 0;
const supabase_1 = require("./supabase");
const saveEvent = async (payload) => {
    await supabase_1.supabase.from("events").insert({
        project_id: payload.projectId,
        event_name: payload.event,
        user_id: payload.userId,
        session_id: payload.sessionId,
        properties: payload.properties
    });
};
exports.saveEvent = saveEvent;
