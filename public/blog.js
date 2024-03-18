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

//comments

let replyingTo = null

function createComment(comment) {
	if (comment.data.parentComment && !$("#comment-"+comment.data.parentComment)) {
		return false
	}

	const container = document.createElement("div")
	container.classList.add("comment")
	container.id = "comment-"+comment.id
	
	if (comment.data.parentComment == null) {
		$("#comments").appendChild(container)
	} else {
		$("#comment-"+comment.data.parentComment+" > div").appendChild(container)
	}

	const author = document.createElement("h2")
	author.innerText = comment.data.author
	container.appendChild(author)

	const dateCreated = document.createElement("span")
	dateCreated.innerText = new Date(comment.data.dateCreated.seconds * 1000).toLocaleString()
	dateCreated.classList.add("comment-date")
	author.appendChild(dateCreated)

	const content = document.createElement("div")
	container.appendChild(content)

	const body = document.createElement("p")
	body.innerText = comment.data.body
	content.appendChild(body)

	const interact = document.createElement("div")
	interact.classList.add("comment-interact-bar")
	content.appendChild(interact)

	// const upvote = document.createElement("a")
	// upvote.innerText = "Upvote"
	// interact.appendChild(upvote)

	// const downvote = document.createElement("a")
	// downvote.innerText = "Downvote"
	// interact.appendChild(downvote)

	const reply = document.createElement("a")
	reply.innerText = "Reply"
	interact.appendChild(reply)

	reply.addEventListener('click', ()=>{
		replyingTo = comment.id
		$("#comment-replyto").innerText = "Replying to "+comment.data.author
	})

	return true
}

$("#comment-replyto").addEventListener('click', ()=>{
	replyingTo = null
	$("#comment-replyto").innerText = ""
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
	
	const response = await fetch("/upload-comment", {
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
	
})

async function getComments() {
	const response = await fetch("comments")
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
}

getComments()