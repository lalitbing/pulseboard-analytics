import { supabase } from "../../api/src/db/supabase"

export const saveEvent = async (payload:any)=>{
  await supabase.from("events").insert({
    project_id: payload.projectId,
    event_name: payload.event,
    user_id: payload.userId,
    session_id: payload.sessionId,
    properties: payload.properties
  })
}
