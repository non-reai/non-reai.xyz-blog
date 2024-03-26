import express from 'express'
import { readDoc, writeDoc, whereif } from "./../firestore.js"

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
	
	let comments = await readDoc("comments")

	let comment = comments.filter(comment=>{
		return comment.id == commentId
	})[0]

	let users = await readDoc("users")

	let user = users.filter(user=>{
		return user.id == comment.data.author
	})[0]

	if (!comment) {
		res.statusCode = 404
		res.end()
		return
	}

	if (comment.data.karma.upvotes.includes(res.locals.user.id)) {
		res.statusCode = 409
		res.end()
		return
	}

	comment.data.karma.upvotes.push(res.locals.user.id)
	user.data.karma++

	if (comment.data.karma.downvotes.includes(res.locals.user.id)) {
		let index = comment.data.karma.downvotes.indexOf(res.locals.user.id)
		comment.data.karma.downvotes.splice(index,1)
	}
	
	await writeDoc(
		"comments", 
		commentId,
		comment.data
	)

	await writeDoc(
		"users", 
		user.id,
		user.data
	)

	res.end("Upvoted")
})

router.get('/:commentId/downvote',async (req,res)=>{
	let commentId = req.params.commentId
	
	let comments = await readDoc("comments")

	let comment = comments.filter(comment=>{
		return comment.id == commentId
	})[0]

	let users = await readDoc("users")

	let user = users.filter(user=>{
		return user.id == comment.data.author
	})[0]

	if (!comment) {
		res.statusCode = 404
		res.end()
		return
	}

	if (comment.data.karma.downvotes.includes(res.locals.user.id)) {
		res.statusCode = 409
		res.end()
		return
	}

	comment.data.karma.downvotes.push(res.locals.user.id)
	user.data.karma--

	if (comment.data.karma.upvotes.includes(res.locals.user.id)) {
		let index = comment.data.karma.upvotes.indexOf(res.locals.user.id)
		comment.data.karma.upvotes.splice(index,1)
	}
	
	await writeDoc(
		"comments", 
		commentId,
		comment.data
	)

	await writeDoc(
		"users", 
		user.id,
		user.data
	)

	res.end("Downvoted")
})

router.get('/:commentId/unvote',async (req,res)=>{
	let commentId = req.params.commentId
	
	let comments = await readDoc("comments")

	let comment = comments.filter(comment=>{
		return comment.id == commentId
	})[0]

	let users = await readDoc("users")

	let user = users.filter(user=>{
		return user.id == comment.data.author
	})[0]

	console.log(user)

	if (!comment) {
		res.statusCode = 404
		res.end()
		return
	}
	
	if (comment.data.karma.downvotes.includes(res.locals.user.id)) {
		let index = comment.data.karma.downvotes.indexOf(res.locals.user.id)
		comment.data.karma.downvotes.splice(index,1)
		user.data.karma++
	}

	if (comment.data.karma.upvotes.includes(res.locals.user.id)) {
		let index = comment.data.karma.upvotes.indexOf(res.locals.user.id)
		comment.data.karma.upvotes.splice(index,1)
		user.data.karma--
	}
	
	await writeDoc(
		"comments", 
		commentId,
		comment.data
	)

	await writeDoc(
		"users", 
		user.id,
		user.data
	)

	res.end("Unvoted")
})

export default router