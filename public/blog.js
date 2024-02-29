const $ = (...query) => {
	return document.querySelector(...query)
}

$("#date").innerText = new Date($("#date").innerText).toLocaleString(Navigator.language, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })

document.querySelectorAll(".edit-date").forEach((element)=>{ 
	element.innerText = new Date(element.innerText).toLocaleString(Navigator.language, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
})