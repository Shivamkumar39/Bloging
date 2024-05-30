import express from 'express'
import mongoose, { version } from 'mongoose'
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import admin from "firebase-admin"
import serviceAccountKey from './blogging-986b4-firebase-adminsdk-y8a3f-d04e6896dd.json' assert { type: 'json' };
import { getAuth } from 'firebase-admin/auth'

//import aws from 'aws-sdk'



//schema folders
import User from './Schema/User.js'
import Blog from './Schema/Blog.js'

const server = express()
let PORT = 6500


admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)
})


//email and password regex
let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password


server.use(express.json())
server.use(cors())

mongoose.connect("mongodb://127.0.0.1:27017/Blogging", {
    autoIndex: true
}).then(()=>{
    console.log("db is connected")
}).catch(()=>{
    console.log("db is not connected")
})

//setting up s3 bucket for img uploding
// const s3 = new aws.S3({
//     region: "copy regision avaliable in property and pest hear",
//     accessKeyId: '',//this is availabe in IAM Dashboard and go to Policy editer use Process.env.Aws_aces
//     secretAccessKey: '' //same
// })


// const generateUploadeURL = async () =>{
//     const date = new Date()
//     const imageName = `${nanoid()}-${date.getTime()}.jpeg`

//     return await s3.getSignedUrlPromise('putObject',{
//         Bucket: '',//pest bucket name 
//         key: imageName,
//         Expires: 2000,
//         ContentType: image/jpeg
//     })

// }


const verifyJWT = (req, res, next) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1]

    if(token == null){
        return res.status(401).json({error: "no access token"})
    }
    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if(err){
            return res.status(403).json({error: "acces token is invalid"})
        }
        req.user = user.id
        next()
    })
}


const formatDataSend = (user) =>{

    const access_token = jwt.sign({id: user._id}, process.env.SECRET_ACCESS_KEY)
    return{
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    }
}

//geting username using email id and make it unique username
const generateusername = async (email) => {
    let username = email.split("@")[0];


    let isUsernameNotUnique = await User.exists({"personal_info.username": username}).then((result)=> result)

    isUsernameNotUnique ? username += nanoid().substring(0,5) : "";
    return username

}

//upload imag url route
// server.get('get-upload-url', (req, res) =>{
//     generateUploadeURL().then(url => res.status(200).json({uploadeURL: url}))
//     .catch(err =>{
//         console.log(err.message)
//         return res.status(500).json({error: err.message})
//     })
// })

//signup page and all funtion like personal info
server.post('/signup', (req, res) => {
    let{fullname, email, password} = req.body

    if(fullname.length < 3){
        return res.status(403).json({"error": "Fullname must be grater then 3"})
    }
    if(!email.length){
        return res.status(403).json({"error": "Enter email & correct email"})

    }
    if(!emailRegex.test(email)){
        return res.status(403).json({"error": "Email is invalid"})
    }
    if(!passwordRegex.test(password)){
        return res.status(403).json({"error": "password should be 6 to 16 characters long with a numeric, 1 lowercase and 1 uppercase letters"})
    }

    // bcrypt the password and cheak its correct or not
    bcrypt.hash(password, 6, async (err, hashed_password) => {

       let username = await generateusername(email)

        let user = new User({
            personal_info: {fullname, email, password: hashed_password, username }
        })

        //save the data in mongodb locaal db
        user.save().then((u)=>{

            return res.status(200).json(formatDataSend(u))

        }).catch((err)=>{
            if(err.code == 11000){
                return res.status(500).json({"error":"this email allready present & please login & create new account "})
            }
            return res.status(500).json({"error": err.message})
        })

    })
})


server.post('/signin', (req, res) => {
    let {email, password} = req.body

    User.findOne({ "personal_info.email": email }).then((user) => {

        if(!user){
            return res.status(403).json({"error": "Email not found"})
        }

        if(!user.google_auth){
            bcrypt.compare(password, user.personal_info.password, (err, result) => {
                if(err){
                    return res.status(403).json({"error": "Error occured while login please try agin"})
                }
                if(!result){
                    return res.status(403).json({"error": "incorrect password"})
                }
                else{
                    return res.status(200).json(formatDataSend(user))
                }
            })
    
        }else{
            return res.status(403).json({"error": "Account was created using google. try logginin with google."})
        }

        
        

    }).catch(err =>{
        console.log(err)
        return res.status(500).json({"error": err.message })
    })

})


server.post('/google-auth', async(req, res) =>{

    let{access_token}=req.body

    getAuth()
    .verifyIdToken(access_token)
    .then(async (decodeUser) =>{

        let {email, name, picture} = decodeUser

        picture = picture.replace("s96-c", "s384-c");

        let user = await User.findOne({"personal_info.email": email}).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u)=>{
            return u || null
        }).catch(err =>{
            return res.status(500).json({"error": err.message})
        })

        if(user){ //login
            if(!user.google_auth){
                return res.status(403).json({"error": "the email was signed up without google btn. please log in with password to access the accoutn"})

            }
        }else{//signup
            let username = await generateusername(email)
            user = new User({
                personal_info:{fullname: name, email, username}, //profile_img: picture <- this add for taking profile picture throu google account
                google_auth: true
            })

            await user.save().then((u) =>{
                user= u;
            })

            .catch(err => {
                return res.status(500).json({"error": err.message})
            })
        }
        return res.status(200).json(formatDataSend(user))
        
    }).catch(err =>{
        return res.status(500).json({"error": "faild to authenticate you with google"})
    })
    
})

//for get a blog from backend to frontentend most rsent blog
server.post('/latest-blogs', (req, res) =>{

    let { page } = req.body

    let maxLimit = 5

    Blog.find({draft : false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "publishedAt": -1 })
    .select("blog_id title des activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({blogs})
    }).catch(err =>{
        return res.status(500).json({error: err.message})
    })
})

server.post('/all-latest-blogs-count', (req, res) =>{
    Blog.countDocuments({ draft: false})
    .then(count =>{
        return res.status(200).json({totalDocs: count})
    })
    .catch(err =>{
        console.log(err.message);
        return res.status(500).json({ error: err.message })
    })
})

server.post("/search-blogs-count", (req, res) =>{
    let { tag, query } = req.body
    let findQuery

    if(tag){
        findQuery = {tags: tag, draft: false}
    }else if(query){
        findQuery = {draft: false, title: new RegExp( query, 'i' ), des: new RegExp( query, 'i' )}
    }
    

    Blog.countDocuments(findQuery)
    .then(count =>{
        return res.status(200).json({ totalDocs: count})
    }).catch(err =>{
        console.log(err.message)
        return res.status(500).json({error: err.message})
    })

})

//trending blogs
server.get('/trending-blogs', (req, res) =>{

    Blog.find({draft : false})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"activity.total_reads": -1, "activity.total_likes": -1, "publishedAt": -1})
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then(blogs =>{
        return res.status(200).json({blogs})
    }).catch( err =>{
        return res.status.json({error : err.message})
    })
})


server.post('/search-users', (req, res)=>{
    let  { query } = req.body

    User.find({ 'personal_info.username': new RegExp(query, 'i') })
    .limit(50)
    .select("personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .then(users =>{
        return res.status(200).json({ users })
    }).catch(err =>{
        return res.status(500).json({ error: err.message })
    })


})

//filter to data according to tag & category
server.post('/search-blogs', (req, res) =>{
    let { tag, author, query, page, limit, eliminate_blog } = req.body

    let findQuery;

    if(tag){
        findQuery = {tags: tag, draft: false, blog_id: {$ne: eliminate_blog}}
    }else if(query){
        findQuery = {draft: false, title: new RegExp( query, 'i' ), des: new RegExp( query, 'i' )}
    }else if(author){
        findQuery = {author, draft: false}
    }
    

    let maxLimit = limit ? limit : 2;

    Blog.find(findQuery)
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "publishedAt": -1 })
    .select("blog_id title des activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({blogs})
    }).catch(err =>{
        return res.status(500).json({error: err.message})
    })
})


server.post('/get-profile', (req, res) =>{
    let { username } = req.body

    User.findOne({'personal_info.username': username})
    .select('-personal_info.password -google_auth -updatedAt -blogs')
    .then(user =>{
        return res.status(200).json(user)
    }).catch(err =>{
        console.log(err)
        return res.status(500).json({error: err.message})
    })
})




server.post('/create-blog', verifyJWT, (req, res) =>{

    let authorId = req.user
    let { title, des, tags, content, draft, id} = req.body


    if(!title.length){
        return res.status(403).json({error : "you must provide a title "})
    }

    if(!draft){
        if(!des.length || des.length > 200){
            return res.status(403).json({error : "you must provide description less then 200 characters"})
        }
        // if(!banner.length){
        //     return res.status(403).json({error : "you must provide banner to publish"})
        // }
    
        //console.log(content.blocks.length);
        if(!content.blocks.length){
            return res.status(403).json({error : "There must be some blog content to publish it"})
            
        }
        if(!tags.length || tags.length > 10){
            return res.status(403).json({error : "Tags must be less then 10 and must be 1-2 tag put"})
        }

    }

    

    tags = tags.map(tag => tag.toLowerCase())

    let blog_id = id || title.replace(/[^a-zA-Z0-9]/g, ' ')  // Fixing the regex to use 'g' for global replacement
                    .replace(/\s+/g, "-")          // Replacing one or more spaces with a hyphen
                    .trim()                        // Trimming any leading or trailing spaces
                    + nanoid();                    // Concatenating with the result of nanoid() function

     if(id){

        Blog.findOneAndUpdate({ blog_id }, { title, des, content, tags, draft: draft ? draft : false })
        .then(() =>{
            return res.status(200).json({ id: blog_id})
        }).catch(err =>{
            return res.status(500).json({ error: "filed to updated total post number "})
        })
     }else{
        let blog = new Blog({
            title, 
            des, 
            content, 
            tags, 
            author: authorId, 
            blog_id,
            draft: Boolean(draft)
        })
      
    
        blog.save().then(blog => {
            let incrementVal = draft ? 0 : 1;
            User.findOneAndUpdate({ _id: authorId }, { $inc : {"account_info.total_posts": incrementVal}, $push : {"blogs": blog._id } })
            .then(user => {
                return res.status(200).json({id: blog.blog_id}) 
            }) .catch(err => {
                return res.status(500).json({ error: "faild to update total number post" })
            })
        }).catch(err =>{
            return res.status(500).json({ error: err.message })
        })
     }             




})


server.post("/get-blog", (req, res) =>{
    let { blog_id, mode, draft } = req.body

    let incrementVal = mode != 'edit' ? 1 : 0
    Blog.findOneAndUpdate({blog_id}, {$inc: {"activity.total_reads": incrementVal}})
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .select("title des content activity publishedAt blog_id tags")
    .then(blog =>{

        User.findOneAndUpdate({"personal_info.username": blog.author.personal_info.username},{
            $inc: { "account_info.total_reads": incrementVal}
        } ).catch(err =>{
            return res.status(500).json({ error: err.message})
        })

        if(blog.draft && !draft){
            return res.status(500).json({error: 'you can not acces draft blogs'})
        }

        return res.status(200).json({blog})
    }).catch(err =>{
        return res.status(500).json({ error: err.message})
    })
})

server.listen(PORT, ()=>{
    console.log('lising on port no -> ' + PORT)
}) 