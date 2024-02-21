const $ = (...query) => {
	return document.querySelector(...query)
}

const blogPost = $("#blog-post")

var simplemde = new SimpleMDE({ 
	element: blogPost,
	autosave: {
		enabled: true,
		uniqueId: "blog-post-area",
		delay: 100,
	},
});