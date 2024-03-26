import express from 'express'
import { readDoc, writeDoc, whereif } from "./../firestore.js"

const router = express.Router()

router.get("/self", async (req, res)=>{
	res.end(JSON.stringify(res.locals.user, null, 2))
})

export default router