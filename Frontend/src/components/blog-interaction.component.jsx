import React, { useContext, useState } from 'react'
import { blogContext } from '../pages/blog.page'
import { Link } from 'react-router-dom'
import { UserContext } from '../App'

const BlogInteration = () => {

  let {userAuth: {username}} = useContext(UserContext)
  let { blog: {title, blog_id, activity, activity: { total_likes , total_comments }, author: { personal_info: {username: author_username}}}, setBlog} =  useContext(blogContext)
  return (
    <>

    <hr className='border-grey my-2'/>
        <div className='flex gap-6 justify-between'>
           <div className='flex gap-4 items-center'>
        
                <button className='w-15 h-15  rounded-full flex items-center justify-center '> <i className="fi fi-rs-heart"></i></button>
                <p className='txet-xl text-dark-grey'>Like {total_likes}  </p>
        

            
                <button className='w-15 h-15  rounded-full flex items-center justify-center'> <i className="fi fi-rr-comment-alt"></i></button>
                <p className='txet-xl text-dark-grey'>{total_comments}  </p>
         

            
            {/* social link */}
            <div className='flex gap-3 ml-3 pl-3 pt-2 pb-2 pr-3 bg-dark-grey/30 border-2'>
                <Link to="https://github.com/Shivamkumar39?tab=repositories"> <button className='w-15 h-15  rounded-full flex items-center justify-center' > <i className="fi fi-brands-linkedin hover:text-twitter"></i></button></Link>
                <Link to="https://github.com/Shivamkumar39?tab=repositories"> <button className='w-15 h-15   rounded-full flex items-center justify-center' > <i className="fi fi-brands-github"></i></button></Link>
                <Link to="https://github.com/Shivamkumar39?tab=repositories"> <button className='w-15 h-15  rounded-full flex items-center justify-center' > <i className="fi fi-brands-twitter hover:text-twitter"></i></button></Link>
                <p className=''>Visit My profile</p>
            </div>
          
           </div>
           
           <div className='flex gap-6 items-center'>

            {
              username == author_username ? <Link to={`/editor/${blog_id}`} className='underline hover:text-purple'>Edit</Link> : " "
            }
            <Link to={`https://twitter.com/intent/tweet?text=Read ${title}&url=${location.href}`} ><i className="fi fi-brands-twitter hover:text-twitter"></i></Link>
           </div>

        </div>
    <hr className='border-grey my-2'/>    
    
    </>
  )
}

export default BlogInteration