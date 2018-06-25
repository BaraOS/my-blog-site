var express = require("express");
var passport = require("passport");
var app = express();
var User = require("./models/user");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var mongoose = require("mongoose");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var expressSanitzer = require("express-sanitizer");
var Comment = require("./models/comment");

mongoose.connect("mongodb://localhost/my_blog");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitzer());
app.use(methodOverride("_method"));

app.use(require("express-session")({
    secret: "hello world this is a secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



//new code
app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});


// MONGOOSE/MODEL CONFIG
var blogSchema = new mongoose.Schema({
    title: String,
    image: String,
    body: String,
    created: {type: Date, default: Date.now},
    comments: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
            
         }
      ]
});

var Blog = mongoose.model("Blog", blogSchema);

//INDEX ROUTE
app.get("/", function(req, res){
    Blog.find({}, function(err, blogs){
       if (err){
           console.log("error");
       } else {
           res.render("index", {blogs: blogs});
       }
    });

});




//AUTH Routes
app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res) {

    User.register(new User({username : req.body.username, isAdmin: false}), req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        } 
        passport.authenticate("local")(req, res, function(){
           res.redirect("/"); 
        });
    });
});


//render login form
app.get("/user", function(req, res){
   res.render("user"); 
});

//handle user login
app.post("/user", passport.authenticate("local",{
    successRedirect: "/",
    failureRedirect: "/user"
}), function(req, res){
});

app.get("/user/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});




//NEW ROUTE
app.get("/new", isAdmin, function(req, res){
    res.render("new");
});

//CREATE ROUTE
app.post("/", isAdmin, function(req, res){
    //create blog
    //req.body.blog.body = req.sanitize(req.body.blog.body);
    Blog.create(req.body.blog, function(err, newBlog){
        if(err){
            res.render("new");
        } else{
            //redirect to index
            res.redirect("/");
        }
    });
   
});

//SHOW ROUTE
app.get("/:id", function(req, res){
    Blog.findById(req.params.id).populate("comments").exec(function(err, foundBlog){
        if(err){
            res.redirect("/");
        }else{
            res.render("show", {blog: foundBlog});
        }
    });
});

//EDIT ROUTE
app.get("/:id/edit", isAdmin, function(req, res){
  Blog.findById(req.params.id, function(err, foundBlog){
     if(err){
         res.redirect("/");
     } else{
         res.render("edit", {blog: foundBlog});
     }
  });
});

//UPDATE ROUTE
app.put("/:id", isAdmin, function(req, res){
    //req.body.blog.body = req.sanitize(req.body.blog.body);
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updateBlog){
        if(err){
            res.redirect("/");
        } else{
            res.redirect("/" + req.params.id);
        }
    });
});

//DELETE ROUTE
app.delete("/:id", isAdmin, function(req, res){
    //destroy blog
    Blog.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/");
        } else {
            res.redirect("/");
        }
    });
    //redirect 
});

//comment route
app.get("/:id/comment/new", isLoggedIn, function(req, res){
    //find campground by id
    console.log(req.params.id);
    Blog.findById(req.params.id, function(err, blog){
       if(err){
           console.log(err);
       } else{
            res.render("comment", {blog: blog});
       }
    });
   
});

app.post("/:id/comment", isLoggedIn, function (req, res){
      //lookup campground using ID
    Blog.findById(req.params.id, function(err, blog) {
        if(err){
            console.log(err);
            res.redirect("/");
        } else{
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    console.log(err);
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    blog.comments.push(comment);
                    blog.save();
                    res.redirect("/" + blog._id);

                }
            });
        }
    });
    
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else{
        res.redirect("/user");
    }
}

function isAdmin(req, res, next){

    if(req.isAuthenticated() && req.user.isAdmin){
        return next();
    } else{
        res.redirect("/user");
    }
}

app.listen(3000, () => console.log('Movie Search app listening on port 3000!'));