import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import express from 'express'
import fs from 'fs'
import showdown from 'showdown'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import { readDoc, writeDoc, whereif } from "./firestore.js"

const app = express()

app.use(cookieParser())

app.get("/blogs", async (req, res)=>{
	const limit = req.query.limit || 	100
	const page = req.query.page || 1

	let blogPosts = await readDoc("blog-posts")

	console.log(blogPosts)

	blogPosts.slice(page * limit,page * limit + limit)

	res.end(JSON.stringify(blogPosts, null, 2))
})

app.get("/blog/*", async (req, res)=>{
	let blogId = req.url.split("/")[2]

	let blogHtml = fs.readFileSync(
		resolve(__dirname,"templates/blog.html"),
		{ "encoding":"utf-8" }
	)

	let blogPosts = await readDoc("blog-posts")

	let blogPost = null

	blogPosts.forEach(blogPostQueried=>{
		if (blogPostQueried.id == blogId) {
			blogPost = blogPostQueried
		}
	})

	if (blogPost) {
		blogHtml = blogHtml.replaceAll("[title]", blogPost.data.title)
		blogHtml = blogHtml.replaceAll("[author]", blogPost.data.author)
		blogHtml = blogHtml.replaceAll("[tags]", blogPost.data.tags.join(" </span><span class=\"tag\">"))
		blogHtml = blogHtml.replaceAll("[date]", new Date(blogPost.data.dateCreated.seconds * 1000).toISOString())

		let converter = new showdown.Converter()
		let html = converter.makeHtml(blogPost.data.body)

		blogHtml = blogHtml.replaceAll("[body]", html)

		res.write(blogHtml)
		res.end()

		return
	}

	res.redirect("/404")
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

	const hash = crypto.createHash("sha256").update(req.body.password).digest("hex")

	await writeDoc("users", req.body.username, {
		username: req.body.username,
		password: hash,
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

	const hash = crypto.createHash("sha256").update(req.body.password).digest("hex")

	if (users[0].data.password != hash) {
		res.statusCode = 401
		res.end("Password does not match.")
		return
	}
	
	res.cookie("credentials", JSON.stringify({ username: req.body.username, password: req.body.password }), { maxAge: 1000 * 60 * 60 * 24 * 100 })
	res.end("Logged in successfully")
})

app.use(express.static(resolve(__dirname, 'public')))

app.use(async (req, res, next)=>{
	if (req.cookies.credentials) {
		let credentials = JSON.parse(req.cookies.credentials)
		if (!credentials.username || !credentials.password) {
			res.redirect("/404")
			return
		}
		
		let users = await readDoc("users", whereif("username", "==", credentials.username))

		if (!(users.length > 0)) {
			res.redirect("/404")
			return
		}

		if (users[0].data.isWriter == false) {
			res.redirect("/404")
			return
		}

		const hash = crypto.createHash("sha256").update(credentials.password).digest("hex")

		if (users[0].data.password != hash) {
			res.redirect("/404")
			return
		}
		next()
	} else {
		res.redirect("/404")
	}
})

app.post("/upload-blog", async (req, res)=>{
	let date = new Date()
	let blogPost = {
		title: req.body.title,
		author: req.body.author,
		dateCreated: date,
		tags: req.body.tags,
		body: req.body.body,
	}
	console.log(blogPost)
	await writeDoc("blog-posts", encodeURI(req.body.title + "-" + date.toDateString()),blogPost)
	res.end("uploaded")
})

app.use(express.static(resolve(__dirname, 'private')))

app.use((req, res, next)=>{
	res.redirect("/404")
})

app.listen(80)

