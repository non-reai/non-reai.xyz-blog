import express from 'express'
import { readDoc, writeDoc, whereif } from "./../firestore.js"

const router = express.Router()

router.get("/:blogId", async (req, res)=>{
	let blogId = req.params.blogId

	const comments = await readDoc("comments", whereif("blogId", "==", blogId))
	res.write(JSON.stringify(comments))
	res.end()
})

export default router