import express from 'express'
import crypto from 'crypto'
import { readDoc, writeDoc, queryCollection, where } from "./../firestore.js"

const router = express.Router()

router.get("/", async (req, res)=>{
	// const limit = req.query.limit || 	100
	// const page = req.query.page || 1
	if (!req.query.id) {
		res.statusCode = 400
		res.end("No query id")
		return
	}

	let users = []

	if (typeof req.query.id != "object") {
		users.push(await readDoc("users", req.query.id))
		res.end(JSON.stringify(users, null, 2))
		return
	}

	for (let i = 0; i < req.query.id.length; i++) {
		console.log(req.query.id[i])
		users.push(await readDoc("users", req.query.id[i]))
	}
	
	// blogPosts.slice(page * limit,page * limit + limit)

	res.end(JSON.stringify(users, null, 2))
})

router.get("/:userId", async (req, res, next)=>{
	// const limit = req.query.limit || 	100
	// const page = req.query.page || 1

	if (req.params.userId == "self") {
		next()
		return
	}

	let users = await readDoc("users", req.params.userId)

	if (!users.length > 0) {
		res.statusCode = 404
		res.end()
		return
	}

	res.end(JSON.stringify(users[0], null, 2))
})

router.post("/signup", async (req, res)=>{
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
	
	let users = await queryCollection("users", where("lowerUsername", "==", req.body.username.toLowerCase()))

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

router.post("/login", async (req, res)=>{
	if (!req.body.username || !req.body.password) {
		res.statusCode = 400
		res.end("Malformed data")
		return
	}

	let users = await queryCollection("users", where("lowerUsername", "==", req.body.username.toLowerCase()))

	if (!users.length > 0) {
		res.statusCode = 404
		res.end("User does not exist")
		return
	}

	const hash = crypto.createHash("sha256").update(req.body.password + (users[0].salt || "")).digest("hex")

	if (users[0].password != hash) {
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

export default router