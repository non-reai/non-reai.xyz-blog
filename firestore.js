import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore"

const app = initializeApp({
	credential: cert('./cert.json'),
});

const db = getFirestore(app)

export function where(field, operator, value) {
	return [
		field,
		operator,
		value
	]
}

export async function queryCollection(collectionName) {
	try {
		const collectionRef = db.collection(collectionName)
		const data = []
		let q = collectionRef

		for (let i = 1; i < arguments.length; i++) {
			q = q.where(arguments[i][0],arguments[i][1],arguments[i][2])
		}

		const docSnap = await q.get()

		docSnap.forEach(doc=>{
			let docData = doc.data()
			docData = JSON.parse(JSON.stringify(docData).replaceAll("_seconds", "seconds").replaceAll("_nanoseconds", "nanoseconds"))
			data.push({
				id: doc.id,
				...docData
			})
		})
		return data
	} catch (err) {
		console.log(err)
		return err
	}
}

export async function readDoc(collectionName, documentId) {
	try {
		const docRef = db.collection(collectionName).doc(documentId)
		const docData = await docRef.get()

		if (!docData.exists) {
			return null
		}

		const data = {
			id: docData.id,
			...docData.data()
		}
		return data
	} catch (err) {
		console.log(err)
		return err
	}
}

export async function writeDoc(collectionName, documentId, data) {
	try {
		const docRef = db.collection(collectionName).doc(documentId)
		await docRef.set(data)
		return true
	} catch (err) {
		console.log(err)
		return err
	}
}

export async function updateDoc(collectionName, documentId, data) {
	try {
		const docRef = db.collection(collectionName).doc(documentId)
		await docRef.set(data, { merge: true })
		return true
	} catch (err) {
		console.log(err)
		return err
	}
}