const $ = (...query) => {
	return document.querySelector(...query)
}

function toPlainText(text) {
	let finalText = text
	finalText = finalText.replaceAll("###### ","")
	finalText = finalText.replaceAll("##### ","")
	finalText = finalText.replaceAll("#### ","")
	finalText = finalText.replaceAll("### ","")
	finalText = finalText.replaceAll("## ","")
	finalText = finalText.replaceAll("# ","")
	finalText = finalText.replaceAll("```","")
	finalText = finalText.replaceAll("\n"," ")
	finalText = finalText.replaceAll("---","")
	return finalText
}

async function getBlogPosts() {
	const response = await fetch("/blogs")
	const data = await response.json()
	$("#blogs").firstElementChild.remove()
	data.forEach(blogPost=>{
		const blogCard = document.createElement("div")
		blogCard.classList.add("blog-card")
		blogCard.innerHTML = `
		<div class="head">
			<h1>${blogPost.data.title}</h1>
			<h4><span>${blogPost.data.author}</span> - <span>${new Date(blogPost.data.dateCreated.seconds * 1000).toLocaleString(Navigator.language, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}</span></h4>
		</div>
		<div class="body">
			<p>${toPlainText(blogPost.data.body).substring(0,300)+"..."}</p>
			<a href="/blog/${blogPost.id}">Read</a>
		</div>`
		$("#blogs").appendChild(blogCard)
	})
}

getBlogPosts()