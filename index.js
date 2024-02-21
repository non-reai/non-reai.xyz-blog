import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import express from 'express'
import fs from 'fs'
import showdown from 'showdown'
import { readDoc, writeDoc, whereif } from "./firestore.js"

const app = express()

app.get("/blogs", async (req, res)=>{
	const limit = req.query.limit || 	10

	let blogPosts = await readDoc("blog-posts")

	blogPosts.splice(limit)

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
		blogHtml = blogHtml.replaceAll("[date]", new Date(blogPost.data.dateCreated.seconds * 1000).toISOString())

		let converter = new showdown.Converter()
		let html = converter.makeHtml(blogPost.data.body)

		blogHtml = blogHtml.replaceAll("[body]", html)

		res.write(blogHtml)
		res.end()

		return
	}

	res.statusCode = 404
	res.end()
})

app.use(express.static(resolve(__dirname, 'public')))

app.listen(80)

