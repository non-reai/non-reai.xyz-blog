import express from 'express'
import { readDoc, writeDoc, whereif } from "./../firestore.js"

const router = express.Router()

router.post("/upload-blog", async (req, res)=>{
	let blogId = req.body.id
	
	let blogPost = null
	
	let blogPosts = await readDoc("blog-posts")

	blogPosts.forEach(blogPostQueried=>{
		if (blogPostQueried.id == blogId) {
			blogPost = blogPostQueried
		}
	})

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
			author:  blogPost.data.author,
			dateCreated: blogPost.data.dateCreated,
			edited: true,
			edits: blogPost.data.edits ? blogPost.data.edits.concat({
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
			karma: blogPost.data.karma || 0,
			views: blogPost.data.views || 0,
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