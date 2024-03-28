import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import express from 'express'
import fs from 'fs'
import showdown from 'showdown'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { readDoc, writeDoc, whereif } from "./firestore.js"

import api from './routes/api.js'

dotenv.config()

const app = express()

app.use(cookieParser())

showdown.setOption('strikethrough', true);

app.use(async (req, res, next)=>{
	if (req.cookies["session-id"]) {
		let sessionIds = await readDoc("session-ids", whereif("sessionId", "==", req.cookies["session-id"]))

		if (!(sessionIds.length > 0)) {
			next()
			return
		}

		const users = await readDoc("users", whereif("lowerUsername", "==", sessionIds[0].data.lowerUsername))

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

		blogHtml = blogHtml.replaceAll("[blogId]", blogPost.id)
		blogHtml = blogHtml.replaceAll("[desc]", blogPost.data.body.substring(0,50))
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
	if (res.locals.user.data.isWriter) {
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