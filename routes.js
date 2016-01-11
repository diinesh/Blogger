let isLoggedIn = require('./middleware/isLoggedIn')
let User = require('./models/user')
let then = require('express-then')
let Post = require('./models/post')
let Comment = require('./models/comment')
let multiparty = require('multiparty')

let fs = require('fs')
let DataUri = require('datauri')

require('songbird')

function getDataUri(contentType, data) {
    let image = new DataUri().format('.' + contentType.split('/').pop(), data)
    return `data:${contentType};base64,${image.base64}`
}

module.exports = (app) => {

    let passport = app.passport

    app.get('/', function(req, res) {
        if (req.isAuthenticated())
        {
            res.redirect('/profile/')
        }
        res.render('index.ejs')
    })


    app.get('/login', function(req, res) {
        if (req.isAuthenticated())
        {
            res.redirect('/profile/')
        }
        res.render('login.ejs', {
            message: req.flash('error')
        })
    })

    app.post('/login', passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }))


    app.get('/signup', function(req, res) {
        res.render('signup.ejs', {
            message: req.flash('error')
        })
    })

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile',
        failureRedirect: '/signup',
        failureFlash: true
    }))


    app.get('/profile', isLoggedIn, then(async(req, res) => {
        let posts = await Post.promise.find({user: req.user})

        for (let i = 0; i < posts.length; i++) {
            if (posts[i].image) {
                posts[i].displayImage = getDataUri(posts[i].image.contentType, posts[i].image.data)
            }
        }

        res.render('profile.ejs', {
            user: req.user,
            posts: posts,
            message: req.flash('error')
        })
    }))


    app.get('/post/', isLoggedIn, then(async(req, res) => {
        let postId = req.params.postId

        if (!postId) {
            res.render('post.ejs', {
                post: {},
                verb: 'Create',
                verb2 : 'Create',

            })
            return
        }
    }))

    app.get('/post/:postId?', then(async(req, res) => {
        let postId = req.params.postId

        let post = await Post.promise.findById(postId)
        if (!post) res.send(404, 'Not Found')

        let comments = await post.promise.populate('comments')

        res.render('viewpost.ejs', {
            post: post,
            verb: 'View',
            verb2 : 'View',
            image: getDataUri(post.image.contentType, post.image.data)
        })
    }))

     app.get('/post/edit/:postId?', isLoggedIn, then(async(req, res) => {
        let postId = req.params.postId

        let post = await Post.promise.findById(postId)
        if (!post) res.send(404, 'Not Found')

        res.render('post.ejs', {
            post: post,
            verb: 'Edit',
            verb2 : 'Save',
            image: getDataUri(post.image.contentType, post.image.data)
        })
    }))

    app.post('/post/:postId?', then(async(req, res) => {
        let postId = req.params.postId
        if (!postId) {
            let post = new Post()

            let [{
                title: [title],
                content: [content]
            }, {
                image: [image]
            }] = await new multiparty.Form().promise.parse(req)
            post.title = title
            post.content = content
            post.user = req.user
            post.image.data = await fs.promise.readFile(image.path)
            post.image.contentType = image.headers['content-type']
            await post.save()
            res.redirect('/blog/' + encodeURI(req.user.blogTitle))
            return
        }


        let post = await Post.promise.findById(postId)
        if (!post) res.send(404, 'Not Found')

        let [{
            title: [title],
            content: [content]
        }, {
            image: [file]
        }] = await new multiparty.Form().promise.parse(req)
        post.title = title
        post.content = content
        post.userId = req.user._id
        post.image.data = await fs.promise.readFile(file.path)
        post.image.contentType = file.headers['content-type']
        await post.save()

        res.redirect('/blog/' + encodeURI(req.user.blogTitle))
    }))

    app.get('/deletePost/:postId', then(async(req, res) => {
        let postId = req.params.postId
        await Post.promise.findByIdAndRemove(postId)
        res.redirect('/profile')

    }))

    app.get('/blog/', then(async(req, res) => {

        let users = await User.promise.find()

        if (!users) {
            return res.status(404).render('404.ejs', {
                message: `No users exist.`
            })
        }

        res.render('listblog.ejs', {users})
    }))


    app.get('/blog/:blogId?', then(async(req, res) => {
        let blogTitle = req.params.blogId
            //get all the posts by this user

        let user = await User.promise.findOne({blogTitle})
        if (!user) {
            return res.status(404).render('404.ejs', {
                message: `Blog "${blogTitle}" does not exist.`
            })
        }

        let posts = await Post.promise.find({user})
        posts = await Promise.all(posts.map(post => {
            if (post.image) {
                post.displayImage = getDataUri(post.image.contentType, post.image.data)
            }
            return post.promise.populate('comments')
        }))

        res.render('blog.ejs', {blogTitle, posts})
    }))


    app.post('/addComment/:postId', isLoggedIn, then(async(req, res) => {
        let postId = req.params.postId
        let post = await Post.promise.findById(postId)

        if (!post) res.send(404, 'Not Found')
console.log('Comment :: ', req.body.comment)
        let comment = new Comment()
        comment.content = req.body.comment
        comment.user = req.user
        comment.username = req.user.username
        comment.post = post
        post.comments.push(comment)
        await Promise.all([post.save(), comment.save()])

        res.redirect(req.get('referer'))
    }))



    app.get('/logout', function(req, res) {
        req.logout()
        res.redirect('/')
    })
}
