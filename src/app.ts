import express from "express";
import session from 'express-session';
import route from "./route";
import middleWare from "./middlewares"
import path from "path";
import cookieParser from 'cookie-parser';
var sitemap = require('express-sitemap')();
const sassMiddleware = require('node-sass-middleware');
require('dotenv').config()
import logger from 'morgan';


const app: express.Application = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: process.env.INDENTED_SYNTAX||true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));
var sess: any = {
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  name: 'waldSession',
  cookie: {}
}
 
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}
 
app.use(session(sess))


if (route.length == 0){
  app.get("/", (req, res) => {
    res.send('Le serveur existe bien mais aucune route est renseigné il faut éditer le fichier route.ts');
  });
}

middleWare.forEach((element: any) => {
  app.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
    if(element.path == '*'){
      import("./controller/middleware/" + element.controller).then((ctrl) => {
        new ctrl.default(req, res, next);
      });
    }else{
      if(element.path.endsWith('*')){
        if((element.type.includes(req.method.toLowerCase()) || element.type.includes(req.method.toUpperCase())) && req.url.toLowerCase().startsWith(element.path.replace('/*', ''))){
          import("./controller/middleware/" + element.controller).then((ctrl) => {
              new ctrl.default(req, res, next);
          });
        }else{
          next();
        }
      }else{
        if((element.type.includes(req.method.toLowerCase()) || element.type.includes(req.method.toUpperCase())) && element.path == req.url.toLowerCase()){
          import("./controller/middleware/" + element.controller).then((ctrl) => {
              new ctrl.default(req, res, next);
          });
        }else{
          next();
        }
      }
    }
  });
});

async function registerRoute(element: any){
  switch (element.type) {
    case "get": {
      await import("./controller/routes/" + element.controller).then((ctrl) => {
        app.get(element.path, (req, res) => {
          new ctrl.default(req, res);
        });
      });
      break;
    }
    case "post": {
      await import("./controller/routes/" + element.controller).then((ctrl) => {
        app.post(element.path, (req, res) => {
          new ctrl.default(req, res);
        });
      });
      break;
    }
    case "put": {
      await import("./controller/routes/" + element.controller).then((ctrl) => {
        app.put(element.path, (req, res) => {
          new ctrl.default(req, res);
        });
      });
      break;
    }
    case "patch": {
      await import("./controller/routes/" + element.controller).then((ctrl) => {
        app.patch(element.path, (req, res) => {
          new ctrl.default(req, res);
        });
      });
      break;
    }
    case "delete": {
      await import("./controller/routes/" + element.controller).then((ctrl) => {
        app.delete(element.path, (req, res) => {
          new ctrl.default(req, res);
        });
      });
      break;
    }
    default: {
      await import("./controller/routes/" + element.controller).then((ctrl) => {
        app.get(element.path, (req, res) => {
          new ctrl.default(req, res);
        });
      });
      break;
    }
  }
}

async function importRoutes(){
  for(let element of route){
    await registerRoute(element);
    console.log(`Info : ${element.path} Registered`)
  }
  console.log('Toutes les routes sont enregistré.');

  app.use(function(req: express.Request, res: express.Response, next: express.NextFunction){
    import("./controller/errorController").then((ctrl)=>{
      new ctrl.default(req, res, next);
    });
  })

  
  sitemap.generate(app); // generate sitemap from express route, you can set generate inside sitemap({})
  
  sitemap.XMLtoFile(__dirname+'/public/sitemap.xml'); // write this map to file
}

importRoutes();


let server = require("http").createServer(app);

var io = require("socket.io")(server);

import('./socket').then((socket) => {
  socket.default(io)
  console.log('Info : Socket.io listening')
});


server.listen(process.env.APP_PORT || 3000, () => console.log("Info : Server Running"));
