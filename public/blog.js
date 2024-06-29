const $ = (...query) => {
	return document.querySelector(...query)
}

$("#date").innerText = new Date($("#date").innerText).toLocaleString(Navigator.language, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })

document.querySelectorAll(".edit-date").forEach((element)=>{ 
	element.innerText = new Date(element.innerText).toLocaleString(Navigator.language, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
})

if ($("#edits").innerText == "Edits:") {
	$("#edits").remove()
}

let user = null

async function getUser() {
	const response = await fetch("/api/users/self")
	if (response.status == 200) {
		user = await response.json()
	}
}

getUser().then(()=>{
	if (!user) {
		$("#comment-post-button").classList.add("disabled")
	}
	getComments()
})

//comments

let replyingTo = null

function createComment(comment) {
	if (comment.parentComment && !$("#comment-"+comment.parentComment)) {
		return false
	}

	const container = document.createElement("div")
	container.classList.add("comment")
	container.id = "comment-"+comment.id
	
	if (comment.parentComment == null) {
		$("#comments").appendChild(container)
	} else {
		$("#comment-"+comment.parentComment+" > div").appendChild(container)
	}

	const author = document.createElement("h2")
	author.innerText = comment.author
	author.classList.add("user-replace")
	container.appendChild(author)

	const dateCreated = document.createElement("span")
	dateCreated.innerText = new Date(comment.dateCreated.seconds * 1000).toLocaleString()
	dateCreated.classList.add("comment-date")
	container.appendChild(dateCreated)

	const content = document.createElement("div")
	container.appendChild(content)

	const body = document.createElement("p")
	body.innerText = comment.body
	content.appendChild(body)

	const interact = document.createElement("div")
	interact.classList.add("comment-interact-bar")
	content.appendChild(interact)

	if (!user) {
		const karma = document.createElement("span")
		karma.innerText = comment.karma.upvotes.length - comment.karma.downvotes.length
		interact.appendChild(karma)

		return true
	}

	const upvote = document.createElement("a")
	upvote.innerText = "Upvote"
	interact.appendChild(upvote)

	const karma = document.createElement("span")
	karma.innerText = comment.karma.upvotes.length - comment.karma.downvotes.length
	interact.appendChild(karma)

	const downvote = document.createElement("a")
	downvote.innerText = "Downvote"
	interact.appendChild(downvote)

	const reply = document.createElement("a")
	reply.innerText = "Reply"
	interact.appendChild(reply)

	if (comment.karma.upvotes.includes(user.id)) {
		upvote.classList.add("karma-voted")
		downvote.classList.remove("karma-voted")
	} else if (comment.karma.downvotes.includes(user.id)) {
		downvote.classList.add("karma-voted")
		upvote.classList.remove("karma-voted")
	}

	upvote.addEventListener('click', async ()=>{
		if (upvote.classList.contains("karma-voted")) {
			upvote.classList.remove("karma-voted")
			karma.innerText = parseInt(karma.innerText) - 1
		
			await fetch("/api/comments/"+comment.id+"/unvote")
		} else {
			upvote.classList.add("karma-voted")

			if (downvote.classList.contains("karma-voted")) {
				karma.innerText = parseInt(karma.innerText) + 1
			}
			
			downvote.classList.remove("karma-voted")
			karma.innerText = parseInt(karma.innerText) + 1

			await fetch("/api/comments/"+comment.id+"/unvote")
			await fetch("/api/comments/"+comment.id+"/upvote")
		}
	})

	downvote.addEventListener('click', async ()=>{
		if (downvote.classList.contains("karma-voted")) {
			downvote.classList.remove("karma-voted")
			karma.innerText = parseInt(karma.innerText) + 1
		
			await fetch("/api/comments/"+comment.id+"/unvote")
		} else {
			downvote.classList.add("karma-voted")
			
			if (upvote.classList.contains("karma-voted")) {
				karma.innerText = parseInt(karma.innerText) - 1
			}
			
			upvote.classList.remove("karma-voted")
			karma.innerText = parseInt(karma.innerText) - 1

			await fetch("/api/comments/"+comment.id+"/unvote")
			await fetch("/api/comments/"+comment.id+"/downvote")
		}
	})

	reply.addEventListener('click', ()=>{
		replyingTo = comment.id
		$("#comment-replyto").innerText = "Replying to "+comment.author
		$("#comment-replyto-content").innerText = comment.body
		$(".comment-input").focus()
	})

	return true
}

$("#comment-replyto").addEventListener('click', ()=>{
	replyingTo = null
	$("#comment-replyto").innerText = ""
	$("#comment-replyto-content").innerText = ""
})

$("#comment-post-button").addEventListener('click', async ()=>{
	if ($(".comment-input").value.length < 1) {
		return
	}

	const commentData = {
		body: $(".comment-input").value,
		blogId: window.location.pathname.split("/")[2],
		parentComment: replyingTo
	}
	
	const response = await fetch("/api/comments/upload-comment", {
		method: "POST",
		body: JSON.stringify(commentData),
		headers: {
			"Content-Type": "application/json"
		}
	})

	await getComments()

	replyingTo = null
	$("#comment-replyto").innerText = ""
	$(".comment-input").value = ""
	$("#comment-replyto-content").innerText = ""
})

async function getComments() {
	
	const response = await fetch("/api/comments/" + window.location.pathname.split("/")[2])
	const comments = await response.json()

	const leftoverComments = comments

	const commentElements = document.querySelectorAll(".comment")

	commentElements.forEach(element=>{
		element.remove()
	})
	
	while (leftoverComments.length > 0) {
		console.log(leftoverComments.length)

		leftoverComments.forEach((comment, index)=>{
			let commentCreated = createComment(comment)

			console.log(commentCreated, index, leftoverComments.toSpliced(index,index))

			if (commentCreated) {
				leftoverComments.splice(index, 1)
			}
		})

		await new Promise(res=>{
			setTimeout(res)
		})
	}

	getUsers()
}


// get users

function uniq(a) {
	return a.sort().filter(function(item, pos, ary) {
		return !pos || item != ary[pos - 1];
	});
}


async function getUsers() {
	let usersNeedToQuery = []

	document.querySelectorAll(".user-replace").forEach(element=>{
		usersNeedToQuery.push(element.innerText)
	})

	usersNeedToQuery = uniq(usersNeedToQuery)

	console.log("/api/users?id="+usersNeedToQuery.join("&id="))
	const response = await fetch("/api/users?id="+usersNeedToQuery.join("&id="))
	const users = await response.json()

	console.log(users)

	document.querySelectorAll(".user-replace").forEach(element=>{
		let user = users.find(user => {
			if (!user) {
				return
			}
			return user.id == element.innerText
		})
		if (user) {
			element.innerText = user.username
		}
	})
}