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

const blogCache = {}

const app = express()

app.use(cookieParser())

showdown.setOption('strikethrough', true);

app.get("/blogs", async (req, res)=>{
	const limit = req.query.limit || 	100
	const page = req.query.page || 1

	let blogPosts = await readDoc("blog-posts")

	blogPosts.slice(page * limit,page * limit + limit)

	res.end(JSON.stringify(blogPosts, null, 2))
})

app.get("/blog/:blogId/:slug?", async (req, res)=>{
	let blogId = req.params.blogId
	let slug = req.params.slug

	console.log(blogId, slug)
	
	let blogPost = blogCache[blogId] || null
	
	if (!blogPost) {
		let blogPosts = await readDoc("blog-posts")

		blogPosts.forEach(blogPostQueried=>{
			if (blogPostQueried.id == blogId) {
				blogPost = blogPostQueried
			}
		})
		
		blogCache[blogId] = blogPost
	}
	
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
				finalString += element.author + "</span> @ <span class='edit-date'>" + new Date(element.dateEdited.seconds * 1000).toISOString() + "</span>, <span class='edit-author'>"
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

		console.log(html)

		html = convertUnicodeToHtmlSafe(html)

		blogHtml = blogHtml.replaceAll("[body]", html)

		res.write(blogHtml)
		res.end()

		setTimeout(()=>{
			delete blogCache[blogId]
		}, 30000)

		return
	}
	
	res.statusCode = 404
	res.sendFile(resolve(__dirname,"public/404/index.html"))
})

app.get("/blog-raw/:blogId", async (req, res)=>{
	let blogId = req.params.blogId

	let blogPost = blogCache[blogId] || null

	if (!blogPost) {
		let blogPosts = await readDoc("blog-posts")

		blogPosts.forEach(blogPostQueried=>{
			if (blogPostQueried.id == blogId) {
				blogPost = blogPostQueried
			}
		})

		blogCache[blogId] = blogPost
	}

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
	
	let users = await readDoc("users", whereif("username", "==", req.body.username))

	if (users.length > 0) {
		res.statusCode = 409
		res.end("User already exists")
		return
	}

	const salt = crypto.randomBytes(64).toString("hex")

	const hash = crypto.createHash("sha256").update(req.body.password+salt).digest("hex")

	await writeDoc("users", req.body.username, {
		username: req.body.username,
		password: hash,
		salt: salt,
		isWriter: false,
	})
	res.cookie("credentials", JSON.stringify({ username: req.body.username, password: req.body.password }), { maxAge: 1000 * 60 * 60 * 24 * 100 })
	res.end("Created user successfully")
})

app.post("/login", async (req, res)=>{
	if (!req.body.username || !req.body.password) {
		res.statusCode = 400
		res.end("Malformed data")
		return
	}

	let users = await readDoc("users", whereif("username", "==", req.body.username))

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
	
	res.cookie("credentials", JSON.stringify({ username: req.body.username, password: req.body.password }), { maxAge: 1000 * 60 * 60 * 24 * 100 })
	res.end("Logged in successfully")
})

app.use(express.static('public'))

app.use(async (req, res, next)=>{
	if (req.cookies.credentials) {
		let credentials = JSON.parse(req.cookies.credentials)
		if (!credentials.username || !credentials.password) {
			res.sendFile(resolve(__dirname,"public/404/index.html"))
			return
		}
		
		let users = await readDoc("users", whereif("username", "==", credentials.username))

		if (!(users.length > 0)) {
			res.sendFile(resolve(__dirname,"public/404/index.html"))
			return
		}

		if (users[0].data.isWriter == false) {
			res.sendFile(resolve(__dirname,"public/404/index.html"))
			return
		}

		const hash = crypto.createHash("sha256").update(credentials.password + (users[0].data.salt || "")).digest("hex")

		if (users[0].data.password != hash) {
			res.sendFile(resolve(__dirname,"public/404/index.html"))
			return
		}
		next()
	} else {
		res.sendFile(resolve(__dirname,"public/404/index.html"))
	}
})

app.post("/upload-blog", async (req, res)=>{
	let blogId = req.body.id
	
	let blogPost = blogCache[blogId] || null
	
	if (!blogPost) {
		let blogPosts = await readDoc("blog-posts")

		blogPosts.forEach(blogPostQueried=>{
			if (blogPostQueried.id == blogId) {
				blogPost = blogPostQueried
			}
		})

		blogCache[blogId] = blogPost
	}

	if (!blogPost) {
		blogId = Math.random().toString().substring(2,10)
	}
	
	let blogPostData = {
		title: req.body.title,
		author: req.body.author,
		dateCreated: new Date(),
		edited: false,
		edits: [],
		tags: req.body.tags,
		body: req.body.body,
	}
	
	if (blogPost) {
		blogPostData = {
			title: req.body.title,
			author: req.body.author,
			dateCreated: blogPost.data.dateCreated,
			edited: true,
			edits: blogPost.data.edits ? blogPost.data.edits.concat({
				author: req.body.author,
				dateEdited: new Date(),
			}) : [
				{
					author: req.body.author,
					dateEdited: new Date(),
				}
			],
			tags: req.body.tags,
			body: req.body.body,
		}
	}
	
	console.log(blogPostData)
	await writeDoc(
		"blog-posts", 
		blogId,
		blogPostData
	)
	res.end("Uploaded")
})

app.use(express.static('private'))

app.use((req, res, next)=>{
	res.statusCode = 404
	res.sendFile(resolve(__dirname,"public/404/index.html"))
})

app.listen(3030)