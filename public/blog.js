const $ = (...query) => {
	return document.querySelector(...query)
}

let date = new Date($("#date").innerText)

$("#date").innerText = date.toLocaleString(Navigator.language, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })