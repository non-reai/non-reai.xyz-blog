const $ = (...query) => {
	return document.querySelector(...query)
}

async function getBlogPosts() {
	const response = await fetch("/api/blogs")
	const data = await response.json()
	$("#blogs").firstElementChild.remove()

	data.sort((a, b)=>{
		return (b.dateCreated.seconds - a.dateCreated.seconds)
	})
	
	data.forEach(blogPost=>{
		const blogCard = document.createElement("div")
		blogCard.classList.add("blog-card")
		blogCard.innerHTML = `
		<div class="head">
			<h1>${blogPost.title}</h1>
			<h4><span class="user-replace">${blogPost.author}</span> - <span>${new Date(blogPost.dateCreated.seconds * 1000).toLocaleString(Navigator.language, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}</span></h4>
		</div>
		<div class="body">
			<p></p>
			<a href="/blog/${blogPost.id}">Read</a>
		</div>`
		blogCard.lastElementChild.firstElementChild.innerHTML = marked.parse(blogPost.body.substring(0,500))+"..."
		$("#blogs").appendChild(blogCard)
	})

	getUsers()
}

getBlogPosts()

// get users

function uniq(a) {
	return a.sort().filter(function(item, pos, ary) {
		return !pos || item != ary[pos - 1];
	});
}

async function getUsers() {
	let usersNeedToQuery = []
	
	document.querySelectorAll(".user-replace").forEach(element=>{
		console.log("hehehe")
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