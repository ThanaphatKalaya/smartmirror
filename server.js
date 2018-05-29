var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
//var User = require('./models/user');
var Mirror = require('./models/mirror');
var fs = require("fs");
/*
var mirror_settings = {
    newsapi_key: "b715722295c542c98659778f781e70ab",
    news_category: "all",
    maps_api_key: "AIzaSyDjV6hQ6W2NYpCoB746pWBIA7",
    from_lat: 13.8184284,
    from_lng: 100.5147496,
    to_lat: 13.8254294,
    to_lng: 100.5274524
};

fs.writeFile( "mirror_settings.json", JSON.stringify( mirror_settings ), "utf8" );
*/
var keys = require("./keys.json");

// invoke an instance of express application.
var app = express();

// set our application port
app.set('port', 9000);

// set view engine
app.set('view engine', 'ejs');

// set static files directory
app.use(express.static(__dirname + '/static'))

// set morgan to log info about our requests for development use.
app.use(morgan('dev'));

// initialize body-parser to parse incoming parameters requests to req.body
app.use(bodyParser.urlencoded({ extended: true }));

// initialize cookie-parser to allow us access the cookies stored in the browser. 
app.use(cookieParser());

// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
    key: 'mirror_sid',
    secret: 'somerandomstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));


// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.mirror_sid && !req.session.mirror) {
        res.clearCookie('mirror_sid');
    }
    next();
});


// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    if (req.session.mirror && req.cookies.mirror_sid) {
        res.redirect('/console');
    } else {
        next();
    }    
};


// route for Home-Page
app.get('/', sessionChecker, (req, res) => {
    res.redirect('/login');
});

// route for Mirror-Page
app.get('/mirror/:mirror_id', (req, res) => {
    mirror_id = req.params.mirror_id
    console.log(mirror_id);
    Mirror.findOne({ where: { mirror_id: mirror_id } }).then(function (mirror) {
        res.render('pages/mirror', {
            newsapi_key: keys.newsapi_key,
            news_category: mirror.news_category,
            dir_maps_api_key: keys.maps_api_key,
            from_lat: mirror.from_lat,
            from_lng: mirror.from_lng,
            to_lat: mirror.to_lat,
            to_lng: mirror.to_lng,
            pagename: 'Smart Mirror'
        });
    });
    
});


// route for user signup
app.route('/signup')
    .get(sessionChecker, (req, res) => {
        if ( typeof req.query["massage"] == 'undefined' ) {
            res.render('pages/signup', {
                pagename: 'signup'
            });
        } else {
            res.render('pages/signup', {
                massage: req.query["massage"],
                pagename: 'signup'
            });
        }
    })
    .post((req, res) => {
        Mirror.create({
            mirror_id: req.body.mirror_id,
            password: req.body.password,
            news_category: "all",
            from_lat: 0,
            from_lng: 0,
            to_lat: 0,
            to_lng: 0
        })
        .then(mirror => {
            req.session.mirror = mirror.dataValues;
            res.redirect('/console');
        })
        .catch(error => {
            res.redirect('/signup?massage=mirror_exist');
        });
    });


// route for user Login
app.route('/login')
    .get(sessionChecker, (req, res) => {
        if ( typeof req.query["massage"] == 'undefined' ) {
            res.render('pages/login', {
                pagename: 'login'
            });
        } else {
            res.render('pages/login', {
                massage: req.query["massage"],
                pagename: 'login'
            });
        }
    })
    .post((req, res) => {
        var mirror_id = req.body.mirror_id,
            password = req.body.password;

        Mirror.findOne({ where: { mirror_id: mirror_id } }).then(function (mirror) {
            if (!mirror) {
                res.redirect('/login?massage=mirror_id_or_password_invalid');
            } else if (!mirror.validPassword(password)) {
                res.redirect('/login?massage=mirror_id_or_password_invalid');
            } else {
                req.session.mirror = mirror.dataValues;
                res.redirect('/console');
            }
        });
    });

// route for user direction map
app.get('/console', (req, res) => {
    if (req.session.mirror && req.cookies.mirror_sid) {
        if ( typeof req.query["massage"] == 'undefined' ) {
            res.render('pages/console', {
                mirror_id: req.session.mirror.mirror_id,
                pagename: 'console'
            });
        } else {
            res.render('pages/console', {
                massage: req.query["massage"],
                mirror_id: req.session.mirror.mirror_id,
                pagename: 'console'
            });
        }
    } else {
        res.redirect('/login');
    }
});

// route for user direction map
app.get('/console/dir_map', (req, res) => {
    if (req.session.mirror && req.cookies.mirror_sid) {
        res.render('pages/dir_map', {
            dir_maps_api_key: keys.dir_maps_api_key,
            from_lat: req.session.mirror.from_lat,
            from_lng: req.session.mirror.from_lng,
            to_lat: req.session.mirror.to_lat,
            to_lng: req.session.mirror.to_lng,
            mirror_id: req.session.mirror.mirror_id,
            pagename: 'dir_map'
        });
    } else {
        res.redirect('/login');
    }
});

// route for maps editing page
app.get('/console/maps_edit', (req, res) => {
    if (req.session.mirror && req.cookies.mirror_sid) {
        res.render('pages/maps_edit', {
            maps_api_key: keys.maps_api_key,
            from_lat: req.session.mirror.from_lat,
            from_lng: req.session.mirror.from_lng,
            to_lat: req.session.mirror.to_lat,
            to_lng: req.session.mirror.to_lng,
            username: req.session.mirror.mirror_id,
            pagename: 'maps_edit'
        });
    } else {
        res.redirect('/login');
    }
});

// route for updating user maps
app.post('/console/maps_edit', (req, res) => {
    if (req.session.mirror && req.cookies.mirror_sid) {
        req.session.mirror.from_lat = req.body.from_lat;
        req.session.mirror.from_lng = req.body.from_lng;
        req.session.mirror.to_lat = req.body.to_lat;
        req.session.mirror.to_lng = req.body.to_lng;
        Mirror.update(
            {from_lat: req.body.from_lat,
             from_lng: req.body.from_lng,
             to_lat: req.body.to_lat,
             to_lng: req.body.to_lng
            },
            {returning: true, where: {mirror_id: req.session.mirror.mirror_id} }
        )
        res.redirect('/console?massage=map_locations_edited');
    } else {
        res.redirect('/login');
    }
});

// route for news catagory editing page
app.get('/console/news_edit', (req, res) => {
    if (req.session.mirror && req.cookies.mirror_sid) {
        res.render('pages/news_edit', {
            news_category: req.session.mirror.news_category,
            username: req.session.mirror.mirror_id,
            pagename: 'news_edit'
        });
    } else {
        res.redirect('/login');
    }
});

// route for updating news catagory
app.post('/console/news_edit', (req, res) => {
    if (req.session.mirror && req.cookies.mirror_sid) {
        req.session.mirror.news_category = req.body.news_category;
        Mirror.update(
            {news_category: req.body.news_category
            },
            {returning: true, where: {mirror_id: req.session.mirror.mirror_id} }
        )
        res.redirect('/console?massage=news_category_edited_to_' + req.body.news_category);
    } else {
        res.redirect('/login');
    }
});


// route for user logout
app.get('/logout', (req, res) => {
    if (req.session.mirror && req.cookies.mirror_sid) {
        res.clearCookie('mirror_sid');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});


// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
});


// start the express server
app.listen(app.get('port'), () => console.log(`App started on port ${app.get('port')}`));
