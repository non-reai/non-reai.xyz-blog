import express from 'express'
import { readDoc, writeDoc, whereif } from "./../firestore.js"
import { createCanvas, registerFont } from 'canvas'

const router = express.Router()

router.get("/", async (req, res)=>{
	// const limit = req.query.limit || 	100
	// const page = req.query.page || 1

	let blogPosts = await readDoc("blog-posts")

	// blogPosts.slice(page * limit,page * limit + limit)

	res.end(JSON.stringify(blogPosts, null, 2))
})

router.get("/cover-image/:blogId", async (req, res)=>{
	let blogId = req.params.blogId

	let blogPost = null

	let blogPosts = await readDoc("blog-posts")

	blogPosts.forEach(blogPostQueried=>{
		if (blogPostQueried.id == blogId) {
			blogPost = blogPostQueried
		}
	})

	if (!blogPost) {
		res.statusCode = 404
		res.end()
		return
	}

	let users = await readDoc("users")

	let user = users.filter((user)=>{
		return user.id == blogPost.data.author
	})[0]

	function wrapLines(text) {
		return getLines(text, 1550).join("\n")
	}

	function getLines(text, maxWidth) {
		var words = text.split(" ");
		var lines = [];
		var currentLine = words[0];

		for (var i = 1; i < words.length; i++) {
			var word = words[i];
			var width = ctx.measureText(currentLine + " " + word).width;
			if (width < maxWidth) {
				currentLine += " " + word;
			} else {
				lines.push(currentLine);
				currentLine = word;
			}
		}
		lines.push(currentLine);
		return lines;
	}
	
	const canvas = createCanvas(1600, 900)
	const ctx = canvas.getContext('2d')

	ctx.fillStyle = "#ffb938";
	ctx.fillRect(0,0,1600, 500)
	ctx.fillStyle = "white";
	ctx.fillRect(0,500,1600, 400)

	ctx.font = "bold 4rem Arial";
	ctx.fillStyle = "black";

	ctx.fillText(wrapLines(blogPost.data.title), 50, 220);

	ctx.font = "bold 2rem Arial";
	ctx.fillStyle = "black";

	ctx.fillText("blog.non-reai.xyz", 50, 75);

	ctx.fillText("by " + user.data.username, 50, 415);

	ctx.font = "1rem Arial";	

	ctx.fillText(wrapLines(blogPost.data.body), 50, 575);

	const image = canvas.toBuffer("image/png")

	res.end(image)
})

export default router