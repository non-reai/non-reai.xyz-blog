const $ = (...query) => {
	return document.querySelector(...query)
}

async function getBlogPosts() {
	const response = await fetch("/api/blogs")
	const data = await response.json()
	$("#blogs").firstElementChild.remove()

	data.sort((a, b)=>{
		return (b.data.dateCreated.seconds - a.data.dateCreated.seconds)
	})
	
	data.forEach(blogPost=>{
		const blogCard = document.createElement("div")
		blogCard.classList.add("blog-card")
		blogCard.innerHTML = `
		<div class="head">
			<h1>${blogPost.data.title}</h1>
			<h4><span class="user-replace">${blogPost.data.author}</span> - <span>${new Date(blogPost.data.dateCreated.seconds * 1000).toLocaleString(Navigator.language, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}</span></h4>
		</div>
		<div class="body">
			<p></p>
			<a href="/blog/${blogPost.id}">Read</a>
		</div>`
		blogCard.lastElementChild.firstElementChild.innerText = blogPost.data.body.substring(0,300)+"..."
		$("#blogs").appendChild(blogCard)
	})
}

getBlogPosts()

// get users

async function getUsers() {
	const response = await fetch("/api/users")
	const users = await response.json()

	setInterval(()=>{
		document.querySelectorAll(".user-replace").forEach(element=>{
			let user = users.find(user => {
				return user.id == element.innerText
			})
			if (user) {
				element.innerText = user.data.username
			}
		})
	},100)
}

getUsers()