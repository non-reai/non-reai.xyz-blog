import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import express from 'express'
import showdown from 'showdown'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { readDoc, writeDoc, where, queryCollection } from "./firestore.js"

import api from './routes/api.js'

dotenv.config()

const app = express()

app.use(cookieParser())

app.set("view engine", "ejs")

showdown.setOption('strikethrough', true);

app.use(async (req, res, next)=>{
	if (req.cookies["session-id"]) {
		let sessionIds = await queryCollection("session-ids", where("sessionId", "==", req.cookies["session-id"]))

		if (!(sessionIds.length > 0)) {
			next()
			return
		}

		const users = await queryCollection("users", where("lowerUsername", "==", sessionIds[0].lowerUsername))

		if (!users[0]) {
			next()
			return
		}

		res.locals.user = users[0]
	}
	next()
})

app.use("/api", api)

app.get("/blog/:blogId/:slug?", async (req, res)=>{
	let blogId = req.params.blogId
	let slug = req.params.slug

	console.log(blogId, slug)
	
	let blogPost = await readDoc("blog-posts", blogId)

	function convertUnicodeToHtmlSafe(html) {
		return html.replaceAll(/[\u00A0-\u2666]/g, function(c) {
			 return '&#'+c.charCodeAt(0)+';';
		})
	}

	if (blogPost) {
		if (!slug || slug != blogPost.title.replaceAll(" ","-")) {
			res.redirect("/blog/"+blogId+"/"+encodeURIComponent(blogPost.title.replaceAll(" ","-")))
			return
		}

		let converter = new showdown.Converter()
		let html = converter.makeHtml(blogPost.body)

		res.render('blog.ejs', {
			blogId: blogPost.id,
			desc: blogPost.body.substring(0,50),
			title: blogPost.title,
			author: blogPost.author,
			tags: blogPost.tags,
			body: convertUnicodeToHtmlSafe(html),
			edits: blogPost.edits,
			date: new Date(blogPost.dateCreated.seconds * 1000)
		})

		return
	}

	res.statusCode = 404
	res.sendFile(resolve(__dirname,"public/404/index.html"))
})

app.get("/blog-raw/:blogId", async (req, res)=>{
	let blogId = req.params.blogId

	
	let blogPost = await readDoc("blog-posts", blogId) 
	
	if (blogPost) {
		res.write(JSON.stringify(blogPost, null, 2))
		res.end()
		return
	}

	res.statusCode = 404
	res.end()
})

app.use(express.static('public'))

app.use((req, res, next)=>{
	if (res.locals.user) {
		next()
	} else {
		res.statusCode = 401
		res.end("Unauthorized")
	}
})

app.use((req, res, next)=>{
	if (res.locals.user.isWriter) {
		next()
	} else {
		res.statusCode = 403
		res.end("Forbidden")
	}
})

app.use(express.static('private'))

app.use((req, res, next)=>{
	res.statusCode = 404
	res.sendFile(resolve(__dirname,"public/404/index.html"))
})

app.listen(3030)