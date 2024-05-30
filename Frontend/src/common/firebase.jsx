
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth'

import { getStorage } from 'firebase/storage'
//import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCCJzGPyZFtYvhdIHyw-ltaMGT48TcOHBc",
  authDomain: "blogging-986b4.firebaseapp.com",
  projectId: "blogging-986b4",
  storageBucket: "blogging-986b4.appspot.com",
  messagingSenderId: "385033512512",
  appId: "1:385033512512:web:810f0e48a55c2f604e21a5",
  measurementId: "G-9KXEZ6S8X9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);


//googleauth
const Provider = new GoogleAuthProvider()

const auth = getAuth()

export const authWithGoogle =  async() =>{
    let user = null
    await signInWithPopup(auth, Provider).then((result) =>{
        user = result.user
    }).catch((err) =>{
        console.log(err)
    })

    return user
}


//image
export const uploadImage = getStorage(app)