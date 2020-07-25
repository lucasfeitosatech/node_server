const express = require('express');
const routes = new express.Router()
const indexController = require('./website/IndexController');
const easytrackingController = require('./easytracking/EasyTrackingController');
const filetrackingController = require('./filetracking/FileTrackingController');


module.exports = routes;

//Rotas para website
routes.get('/', indexController.index);

//Routes para EasyTrackingController
routes.get('/easytracking',easytrackingController.easytrackingRender);  
routes.post('/easytracking',easytrackingController.easytrackingPost);

//Routes para FileTrackingController
routes.get('/filetracking',filetrackingController.filetrackingRender);  
routes.post('/filetracking',filetrackingController.filetrackingPost);

routes