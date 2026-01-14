import { ingestEvent } from "../services/ingest.service"

export const trackBatch = async (req:any,res:any)=>{
  for(const e of req.body.events){
    await ingestEvent({
      ...e,
      projectId: req.project.id
    })
  }

  res.json({ success:true })
}
