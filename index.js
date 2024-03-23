import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import express from 'express'
import fs from 'fs'
import showdown from 'showdown'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { readDoc, writeDoc, whereif } from "./firestore.js"

dotenv.config()

const app = express()

app.use(cookieParser())

showdown.setOption('strikethrough', true);

app.get("/blogs", async (req, res)=>{
	// const limit = req.query.limit || 	100
	// const page = req.query.page || 1

	let blogPosts = await readDoc("blog-posts")

	// blogPosts.slice(page * limit,page * limit + limit)

	res.end(JSON.stringify(blogPosts, null, 2))
})

app.get("/users", async (req, res)=>{
	// const limit = req.query.limit || 	100
	// const page = req.query.page || 1

	let users = await readDoc("users")

	// blogPosts.slice(page * limit,page * limit + limit)

	res.end(JSON.stringify(users, null, 2))
})

app.get("/user/:userId", async (req, res)=>{
	// const limit = req.query.limit || 	100
	// const page = req.query.page || 1

	let users = await readDoc("users")

	users = users.filter((user)=>{
		return user.id == req.params.userId
	})

	if (!users.length > 0) {
		res.statusCode = 404
		res.end()
		return
	}

	res.end(JSON.stringify(users[0], null, 2))
})

app.get("/blog/:blogId/:slug?/comments", async (req, res)=>{
	let blogId = req.params.blogId

	const comments = await readDoc("comments", whereif("blogId", "==", blogId))
	res.write(JSON.stringify(comments))
	res.end()
})

app.get("/blog/:blogId/:slug?", async (req, res)=>{
	let blogId = req.params.blogId
	let slug = req.params.slug

	console.log(blogId, slug)

	let blogPost = null
	
	let blogPosts = await readDoc("blog-posts")

	blogPosts.forEach(blogPostQueried=>{
		if (blogPostQueried.id == blogId) {
			blogPost = blogPostQueried
		}
	})

	let blogHtml = fs.readFileSync(
		"templates/blog.html",
		{ "encoding":"utf-8" }
	)

	function convertUnicodeToHtmlSafe(html) {
		return html.replaceAll(/[\u00A0-\u2666]/g, function(c) {
			 return '&#'+c.charCodeAt(0)+';';
		})
	}

	if (blogPost) {
		if (!slug || slug != blogPost.data.title.replaceAll(" ","-")) {
			res.redirect("/blog/"+blogId+"/"+encodeURIComponent(blogPost.data.title.replaceAll(" ","-")))
			return
		}

		function editsToString(edits) {
			let finalString = ""
			edits.forEach((element)=>{
				finalString += element.author + "</span> @ <span class='edit-date'>" + new Date(element.dateEdited.seconds * 1000).toISOString() + "</span>, <span class='edit-author user-replace'>"
			})
			return finalString.slice(0,-28)
		}

		blogHtml = blogHtml.replaceAll("[title]", blogPost.data.title)
		blogHtml = blogHtml.replaceAll("[author]", blogPost.data.author)
		blogHtml = blogHtml.replaceAll("[tags]", blogPost.data.tags.join(" </span><span class=\"tag\">"))
		blogHtml = blogHtml.replaceAll("[date]", new Date(blogPost.data.dateCreated.seconds * 1000).toISOString())
		blogHtml = blogHtml.replaceAll("[edits]", blogPost.data.edits ? editsToString(blogPost.data.edits): "")

		let converter = new showdown.Converter()
		let html = converter.makeHtml(blogPost.data.body)

		html = convertUnicodeToHtmlSafe(html)

		blogHtml = blogHtml.replaceAll("[body]", html)

		res.write(blogHtml)
		res.end()

		return
	}

	res.statusCode = 404
	res.sendFile(resolve(__dirname,"public/404/index.html"))
})

app.get("/blog-raw/:blogId", async (req, res)=>{
	let blogId = req.params.blogId

	let blogPost = null
	
	let blogPosts = await readDoc("blog-posts")

	blogPosts.forEach(blogPostQueried=>{
		if (blogPostQueried.id == blogId) {
			blogPost = blogPostQueried
		}
	})

	if (blogPost) {
		res.write(JSON.stringify(blogPost, null, 2))
		res.end()
		return
	}

	res.statusCode = 404
	res.end()
})

app.use(express.json())

app.post("/signup", async (req, res)=>{
	if (!req.body.username || !req.body.password) {
		res.statusCode = 400
		res.end("Malformed data")
		return
	}

	if (req.body.password.length < 8) {
		res.statusCode = 400
		res.end("Password too short")
		return
	}
	
	let users = await readDoc("users", whereif("lowerUsername", "==", req.body.username.toLowerCase()))

	if (users.length > 0) {
		res.statusCode = 409
		res.end("User already exists")
		return
	}

	const salt = crypto.randomBytes(64).toString("hex")

	const hash = crypto.createHash("sha256").update(req.body.password+salt).digest("hex")

	const userId = Math.random().toString().substring(2,18)
	
	await writeDoc("users", userId, {
		username: req.body.username,
		lowerUsername: req.body.username.toLowerCase(),
		karma: 0,
		password: hash,
		salt: salt,
		isWriter: false,
	})

	const sessionId = Math.random().toString().substring(2,18)

	await writeDoc("session-ids", sessionId, {
		username: req.body.username,
		lowerUsername: req.body.username.toLowerCase(),
		userId: userId
	})
	
	res.cookie("session-id", sessionId, { maxAge: 1000 * 60 * 60 * 24 * 100 })
	res.end("Created user successfully")
})

app.post("/login", async (req, res)=>{
	if (!req.body.username || !req.body.password) {
		res.statusCode = 400
		res.end("Malformed data")
		return
	}

	let users = await readDoc("users", whereif("lowerUsername", "==", req.body.username.toLowerCase()))

	if (!users.length > 0) {
		res.statusCode = 404
		res.end("User does not exist")
		return
	}

	const hash = crypto.createHash("sha256").update(req.body.password + (users[0].data.salt || "")).digest("hex")

	if (users[0].data.password != hash) {
		res.statusCode = 401
		res.end("Password does not match.")
		return
	}
	
	const sessionId = Math.random().toString().substring(2,18)

	await writeDoc("session-ids", sessionId, {
		username: req.body.username,
		lowerUsername: req.body.username.toLowerCase(),
		userId: users[0].id,
		sessionId: sessionId
	})
	
	res.cookie("session-id", sessionId, { maxAge: 1000 * 60 * 60 * 24 * 100 })
	res.end("Logged in successfully")
})

app.use(express.static('public'))

// Below is logged-in only

app.use(async (req, res, next)=>{
	if (req.cookies["session-id"]) {
		let sessionIds = await readDoc("session-ids", whereif("sessionId", "==", req.cookies["session-id"]))

		if (!(sessionIds.length > 0)) {
			res.statusCode = 401
			res.end()
			return
		}

		const users = await readDoc("users", whereif("lowerUsername", "==", sessionIds[0].data.lowerUsername))

		if (!users[0]) {
			res.statusCode = 401
			res.end()
			return
		}

		res.locals.user = users[0]
		
		next()
	} else {
		res.statusCode = 404
		res.sendFile(resolve(__dirname,"public/404/index.html"))
	}
})

app.post('/upload-comment',async (req,res)=>{
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

app.get('/:commentId/upvote',async (req,res)=>{
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

app.get('/:commentId/downvote',async (req,res)=>{
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

app.get('/:commentId/unvote',async (req,res)=>{
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

app.get("/user", async (req, res)=>{
	res.end(JSON.stringify(res.locals.user, null, 2))
})

// Below is writers only.

app.use(async (req, res, next)=>{
	if (res.locals.user.data.isWriter == false) {
		res.statusCode = 403
		res.end()
		return
	}
	next()
})

app.post("/upload-blog", async (req, res)=>{
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

app.use(express.static('private'))

app.use((req, res, next)=>{
	res.statusCode = 404
	res.sendFile(resolve(__dirname,"public/404/index.html"))
})

app.listen(3030)