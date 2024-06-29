import express from 'express'
import { readDoc, writeDoc } from "./../firestore.js"

const router = express.Router()

router.post("/upload-blog", async (req, res)=>{
	let blogId = req.body.id
		
	let blogPost = await readDoc("blog-posts", blogId)

	if (!blogPost) {
		blogId = Math.random().toString().substring(2,10)
	}
	
	let blogPostData = {
		title: req.body.title,
		author: res.locals.user.id,
		dateCreated: new Date(),
		edited: false,
		edits: [],
		tags: req.body.tags,
		body: req.body.body,
		karma: 0,
		views: 0,
	}
	
	if (blogPost) {
		blogPostData = {
			title: req.body.title,
			author:  blogPost.author,
			dateCreated: blogPost.dateCreated,
			edited: true,
			edits: blogPost.edits ? blogPost.edits.concat({
				author: res.locals.user.id,
				dateEdited: new Date(),
			}) : [
				{
					author: res.locals.user.id,
					dateEdited: new Date(),
				}
			],
			tags: req.body.tags,
			body: req.body.body,
			karma: blogPost.karma || 0,
			views: blogPost.views || 0,
		}
	}
	
	console.log(blogPostData)
	await writeDoc(
		"blog-posts", 
		blogId,
		blogPostData
	)
	res.end(blogId)
})

export default router