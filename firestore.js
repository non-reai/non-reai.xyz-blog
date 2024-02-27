import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, query, getDocs, getDoc, where} from "firebase/firestore"
import dotenv from 'dotenv'

dotenv.config({ path: resolve(__dirname, 'a.env') })
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: process.env['API_KEY'],
	authDomain: process.env['AUTH_DOMAIN'],
	projectId: process.env['PROJECT_ID'],
	storageBucket: process.env['STORAGE_BUCKET'],
	messagingSenderId: process.env['MESSAGING_SENDER_ID'],
	appId: process.env['APP_ID'],
	measurementId: process.env['MEASUREMENT_ID']
};

console.log(process.env)

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app)

export async function readDoc(collectionName, ...queryArgs) {
	try {
		console.log("read firestore")
		const collectionRef = collection(firestoreDb, collectionName)
		const data = []
		const q = query(collectionRef, ...queryArgs)

		const docSnap = await getDocs(q)

		docSnap.forEach(doc=>{
			data.push({
				id: doc.id,
				data: doc.data()
			})
		})
		return data
	} catch (err) {
		return false
	}
}

export async function writeDoc(collectionName, documentId, data) {
	try {
		console.log("write firestore")
		const document = doc(firestoreDb, collectionName, documentId)
		await setDoc(document, data)
		return true
	} catch (err) {
		return false
	}
}

export const whereif = where
