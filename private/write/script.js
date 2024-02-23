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

function onlyUnique(value, index, array) {
	return array.indexOf(value) === index;
}

$("#title").value = readCookie("title") || ""
$("#tags").value = readCookie("tags") || ""

$("#title").addEventListener("input", ()=>{
	createCookie("title", $("#title").value, 100)
})

$("#tags").addEventListener("input", ()=>{
	createCookie("tags", $("#tags").value, 100)
})

setInterval(()=>{
	$("#tags").value = $("#tags").value.replaceAll(", ", ",")
	$("#tags").value = $("#tags").value.split(",").filter(onlyUnique).join(",")
})

$("#post").addEventListener("click", async ()=>{
	const response = await fetch("/upload-blog", {
		method: "POST",
		body: JSON.stringify({
			title: $("#title").value,
			tags: $("#tags").value.split(",").filter(onlyUnique),
			author: JSON.parse(decodeURIComponent(readCookie("credentials"))).username,
			body: simplemde.value(),
		}),
		headers: {
			"Content-Type": "application/json"
		}
	})
	window.open("/", "_Self")
})

function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}