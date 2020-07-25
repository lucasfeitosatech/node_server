const express = require('express');
const routes = new express.Router()
const indexController = require('./website/IndexController');
const easytrackingController = require('./easytracking/EasyTrackingController');

module.exports = routes;

//Rotas para website
routes.get('/', indexController.index);

//Routes para EasyTrackingController
routes.get('/easytracking',easytrackingController.easytrackingRender);  
routes.post('/easytracking',easytrackingController.easytrackingPost);

routes