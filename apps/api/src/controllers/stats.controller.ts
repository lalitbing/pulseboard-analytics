import { supabase } from "../db/supabase"

export const getEventStats = async (req:any,res:any)=>{
    const { from, to } = req.query
  
    let q = supabase
      .from("events")
      .select("created_at")
      .eq("project_id", req.project.id)
  
    if(from && to){
      q = q.gte("created_at", from)
           .lte("created_at", to)
    }
  
    const { data } = await q
    res.json(data)
  }
  

  export const getTopEvents = async (req:any,res:any)=>{
    const { from, to } = req.query;
  
    let q = supabase
      .from("events")
      .select("event_name")
      .eq("project_id", req.project.id);
  
    if(from && to){
      q = q.gte("created_at", from)
           .lte("created_at", to);
    }
  
    const { data } = await q;
  
    const grouped = data!.reduce((acc:any,e:any)=>{
      acc[e.event_name] = (acc[e.event_name] || 0) + 1;
      return acc;
    },{});
  
    res.json(
      Object.entries(grouped).map(([k,v])=>({
        event_name:k,
        count:v
      }))
    );
  };
  


