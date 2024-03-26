import express from 'express'
import { readDoc, writeDoc, whereif } from "./../firestore.js"

const router = express.Router()

router.get("/", async (req, res)=>{
	// const limit = req.query.limit || 	100
	// const page = req.query.page || 1

	let blogPosts = await readDoc("blog-posts")

	// blogPosts.slice(page * limit,page * limit + limit)

	res.end(JSON.stringify(blogPosts, null, 2))
})

export default router