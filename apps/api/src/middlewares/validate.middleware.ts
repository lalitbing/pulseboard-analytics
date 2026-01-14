export const validate =
  (schema:any) =>
  (req:any,res:any,next:any)=>{
    try {
      schema.parse(req.body)
      next()
    } catch (err:any) {
      res.status(400).json({ error: err.errors })
    }
  }