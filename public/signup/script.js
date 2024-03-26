const $ = (...query) => {
	return document.querySelector(...query)
}

$("#submit").addEventListener("click", async ()=>{
	const response = await fetch("/api/users/signup", {
		method: "POST",
		body: JSON.stringify({
			username: $("#username").value,
			password: $("#password").value
		}),
		headers: {
			"Content-Type": "application/json"
		}
	})

	if (response.status.toString().startsWith("4")) {
		$("#status").style.color = "#f54b42"
	} else {
		$("#status").style.color = "#4ef542"
	}

	$("#status").innerText = await response.text()
})