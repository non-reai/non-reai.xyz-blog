import express from 'express'
import { readDoc, writeDoc } from "./../firestore.js"

const router = express.Router()

router.post('/upload-comment',async (req,res)=>{
	let commentId = Math.random().toString().substring(2,18)

	const commentData = {
		author: res.locals.user.id,
		body: req.body.body,
		dateCreated: new Date(),
		blogId: req.body.blogId,
		parentComment: req.body.parentComment,
		karma: {
			upvotes: [],
			downvotes: []
		}
	}

	console.log(commentData)
	
	await writeDoc(
		"comments", 
		commentId,
		commentData
	)

	res.end(commentId)
})

router.get('/:commentId/upvote',async (req,res)=>{
	let commentId = req.params.commentId
	
	let comment = await readDoc("comments", commentId)

	let user = await readDoc("users" , comment.author)

	if (!comment) {
		res.statusCode = 404
		res.end()
		return
	}

	if (comment.karma.upvotes.includes(res.locals.user.id)) {
		res.statusCode = 409
		res.end()
		return
	}

	comment.karma.upvotes.push(res.locals.user.id)
	user.karma++

	if (comment.karma.downvotes.includes(res.locals.user.id)) {
		let index = comment.karma.downvotes.indexOf(res.locals.user.id)
		comment.karma.downvotes.splice(index,1)
	}
	
	await writeDoc(
		"comments", 
		commentId,
		comment
	)

	await writeDoc(
		"users", 
		user.id,
		user
	)

	res.end("Upvoted")
})

router.get('/:commentId/downvote',async (req,res)=>{
	let commentId = req.params.commentId
	
	let comment = await readDoc("comments", commentId)

	let user = await readDoc("users" , comment.author)

	if (!comment) {
		res.statusCode = 404
		res.end()
		return
	}

	if (comment.karma.downvotes.includes(res.locals.user.id)) {
		res.statusCode = 409
		res.end()
		return
	}

	comment.karma.downvotes.push(res.locals.user.id)
	user.karma--

	if (comment.karma.upvotes.includes(res.locals.user.id)) {
		let index = comment.karma.upvotes.indexOf(res.locals.user.id)
		comment.karma.upvotes.splice(index,1)
	}
	
	await writeDoc(
		"comments", 
		commentId,
		comment
	)

	await writeDoc(
		"users", 
		user.id,
		user
	)

	res.end("Downvoted")
})

router.get('/:commentId/unvote',async (req,res)=>{
	let commentId = req.params.commentId
	
	let comment = await readDoc("comments", commentId)

	let user = await readDoc("users" , comment.author)

	console.log(user)

	if (!comment) {
		res.statusCode = 404
		res.end()
		return
	}
	
	if (comment.karma.downvotes.includes(res.locals.user.id)) {
		let index = comment.karma.downvotes.indexOf(res.locals.user.id)
		comment.karma.downvotes.splice(index,1)
		user.karma++
	}

	if (comment.karma.upvotes.includes(res.locals.user.id)) {
		let index = comment.karma.upvotes.indexOf(res.locals.user.id)
		comment.karma.upvotes.splice(index,1)
		user.karma--
	}
	
	await writeDoc(
		"comments", 
		commentId,
		comment
	)

	await writeDoc(
		"users", 
		user.id,
		user
	)

	res.end("Unvoted")
})

export default router