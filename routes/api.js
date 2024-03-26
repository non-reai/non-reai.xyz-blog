import express from 'express'

import blogs from './blogs.js'
import users from './users.js'
import comments from './comments.js'
import commentsAuth from './comments-auth.js'
import usersAuth from './users-auth.js'
import blogsWriter from './blogs-writer.js'

const router = express.Router()

router.use(express.json())

router.use('/blogs', blogs)
router.use('/users', users)
router.use('/comments', comments)

// Below is logged-in only

router.use((req, res, next)=>{
	if (res.locals.user) {
		next()
	} else {
		res.statusCode = 401
		res.end("Unauthorized")
	}
})

router.use('/comments', commentsAuth)
router.use('/users', usersAuth)

// Below is writers only.

router.use((req, res, next)=>{
	if (res.locals.user.data.isWriter) {
		next()
	} else {
		res.statusCode = 403
		res.end("Forbidden")
	}
})

router.use('/blogs', blogsWriter)

export default router